const knex = require('knex');
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const streamPromises = require('stream/promises');
const ALGORITHM = 'aes-256-cbc';
const BufferWritableStream = require('./buffer-write');
const {
    createDecipheriv,
    pbkdf2Sync
} = require("crypto");
require('dotenv').config();
const $key = Symbol("key");
const $salt = Symbol("salt");

class Rfc2898DeriveBytes {
    constructor(key, salt) {
        this[$key] = key;
        this[$salt] = salt;
    }

    getBytes(byteCount) {
        const salt = this[$salt];
        const key = this[$key];
        return pbkdf2Sync(key, salt, 1000, byteCount, "sha1");
    }
}

const SOURCE_FOLDER = process.env.SOURCE_FOLDER_PATH;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const pdb = new Rfc2898DeriveBytes(
    "MAKV2SPBNI99212",
    Buffer.from([
        0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65, 0x76
    ])
);
const FILE_ENCRYPTION_KEY = pdb.getBytes(KEY_LENGTH + IV_LENGTH);

const db = knex({
    client: 'mssql',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },
});

const BASE_DIR = path.join(__dirname, 'all_attachments');

async function createFolderStructure(basePath, folderName) {
    const folderPath = path.join(basePath, folderName);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderPath;
}

async function saveAttachments(folderPath, attachmentType, attachments, sourceFolder) {
    const typeFolderPath = path.join(folderPath, attachmentType);
    if (!fs.existsSync(typeFolderPath)) {
        fs.mkdirSync(typeFolderPath);
    }

    for (const attachment of attachments) {
        const sourceFilePath = path.join(sourceFolder, attachment.Path);
        const targetFilePath = path.join(typeFolderPath, `${attachment.FileName || `Attachment_${attachment.ID}`}`);
        try {
            if (fs.existsSync(sourceFilePath)) {
                const buffer = await decryptFile(sourceFilePath)

                console.log({
                    buffer,
                    sourceFilePath
                })
                //await fs.rmSync(targetFilePath);
                fs.writeFile(targetFilePath, buffer, (err) => {
                    if (err) {
                        console.error(`Failed to copy file: ${err.message}`, err);
                        return;
                    }
                    console.log(`File saved successfully to ${targetFilePath}`);
                });

                console.log(`Copied: ${sourceFilePath} -> ${targetFilePath}`);
            } else {
                console.warn(`Source file does not exist: ${sourceFilePath}`);
            }
        } catch (error) {
            console.error(`Failed to copy file: ${sourceFilePath} -> ${targetFilePath}`, error);
        }
    }
}


async function fetchAttachmentsByEntity() {
    try {
        // Ensure base directory exists
        if (!fs.existsSync(BASE_DIR)) {
            fs.mkdirSync(BASE_DIR, { recursive: true });
        }
        const attachments = await db('Attachments').select('*');

        const result = await Promise.map(
            attachments,
            async (attachment) => {
                const [
                    taskLink,
                    commentLink,
                    historyLink,
                    correspondenceLink,
                ] = await Promise.all([
                    db('TaskAttachmentLookup')
                        .join('Tasks', 'TaskAttachmentLookup.TaskID', 'Tasks.ID') // Join with the Tasks table
                        .select('Tasks.CorrespondenceID') // Select CorrespondenceID
                        .where('TaskAttachmentLookup.AttachmentID', attachment.ID) // Filter by AttachmentID
                        .first(),
                    db('CommentsAttachmentLookup as cal')
                        .join('CorrespondenceComments as cc', 'cal.CommentID', 'cc.ID')
                        .select('cc.CorrespondenceID')
                        .where('cal.AttachmentID', attachment.ID)
                        .first(),
                    db('TaskHistoryAssignment')
                        .join('TaskHistoryAttachment', 'TaskHistoryAssignment.TaskHistoryId', 'TaskHistoryAttachment.TaskHistoryId') // Join with TaskHistoryAttachment
                        .join('Tasks', 'TaskHistoryAssignment.TaskId', 'Tasks.ID') // Join with Tasks table
                        .select('Tasks.CorrespondenceID') // Select CorrespondenceID
                        .where('TaskHistoryAttachment.AttachmentId', attachment.ID) // Filter by AttachmentID
                        .first(),
                    db('CorrespondenceAttachmentLookup')
                        .select('CorrespondenceID')
                        .where('AttachmentID', attachment.ID)
                        .first(),
                ]);

                return {
                    attachmentId: attachment.ID,
                    taskLink,
                    commentLink,
                    historyLink,
                    correspondenceLink,
                }
            },
            { concurrency: 5 } // Adjust concurrency based on performance
        );

        const newResult = result.reduce((acc, item) => {
            const { attachmentId } = item;

            if (item.taskLink) {
                acc.push({ attachmentId, correspondenceId: item.taskLink.CorrespondenceID });
            }

            if (item.commentLink) {
                acc.push({ attachmentId, correspondenceId: item.commentLink.CorrespondenceID });
            }

            if (item.historyLink) {
                acc.push({ attachmentId, correspondenceId: item.historyLink.CorrespondenceID });
            }

            if (item.correspondenceLink) {
                acc.push({ attachmentId, CorrespondenceId: item.correspondenceLink.CorrespondenceID });
            }

            return acc;
        }, []);

        const grouped = newResult.reduce((acc, item) => {
            const correspondenceId = item.correspondenceId; // Assuming correspondenceId is consistent
            if (!correspondenceId) return acc; // Skip items with no correspondenceId

            // Group attachments by correspondenceId
            if (!acc.grouped[correspondenceId]) {
                acc.grouped[correspondenceId] = new Set(); // Use Set to avoid duplicate attachmentIds
            }
            acc.grouped[correspondenceId].add(item.attachmentId);

            // Track distinct correspondenceIds
            acc.distinctCorrespondenceIds.add(correspondenceId);

            return acc;
        }, { grouped: {}, distinctCorrespondenceIds: new Set() });


        const distinctCorrespondenceIds = Array.from(grouped.distinctCorrespondenceIds);

        const entities = await db('Correspondences')
            .select('Correspondences.ID', 'Correspondences.EntityId', 'Correspondences.Subject', 'LKEntityStucture.Name')
            .join('LKEntityStucture', 'LKEntityStucture.ID', '=', 'Correspondences.EntityId')
            .whereIn('Correspondences.ID', distinctCorrespondenceIds);

        const entityMap = entities.reduce((map, item) => {
            if (!map[item.EntityId]) {
                map[item.EntityId] = [];
            }
            map[item.EntityId].push(item.ID);
            return map;
        }, {});

        const correspondences = grouped.grouped;

        await Promise.map(Object.keys(entityMap), async (entityId) => {
            const entityName = entities.find(e => Number(e.EntityId) === Number(entityId)).Name;
            const entityFolderPath = await createFolderStructure(BASE_DIR, entityName);
            console.log({ entityFolderPath })
            await Promise.map(entityMap[entityId], async (correspondenceId) => {
                if (correspondences[correspondenceId]) {
                    const correspondence = correspondences[correspondenceId];
                    const correspondenceName = entities.find(e => Number(e.ID) === Number(correspondenceId))?.Subject;
                    console.log({ correspondenceName })
                    const correspondenceFolderPath = await createFolderStructure(
                        entityFolderPath,
                        correspondenceName || `Correspondence_${correspondenceId}`
                    );

                    const attachmentIds = Array.from(correspondence);
                    const allAttachments = attachments.filter(attachment => attachmentIds.includes(attachment.ID));
                    console.log({ attLength: allAttachments.length })
                    await saveAttachments(
                        correspondenceFolderPath,
                        '',
                        allAttachments,
                        SOURCE_FOLDER
                    );
                }
            });
        });

        return result;

        console.log('All entities processed successfully.');
    } catch (error) {
        console.error('Error fetching attachments:', error);
    } finally {
        await db.destroy();
    }
}




async function decryptFile(fileAbsolutePath) {
    const { decipher, readStream } = decryptFileByAbsolutePath(fileAbsolutePath);
    const bufferStream = new BufferWritableStream();

    await streamPromises.pipeline(readStream, decipher, bufferStream);
    console.debug(`File ${fileAbsolutePath} decrypted successfully`);
    return bufferStream.getBuffer();
}

function getFileDecipher() {
    const key = FILE_ENCRYPTION_KEY.subarray(0, KEY_LENGTH);
    const iv = FILE_ENCRYPTION_KEY.subarray(KEY_LENGTH, KEY_LENGTH + IV_LENGTH);
    return createDecipheriv(ALGORITHM, key, iv);
}

function decryptFileByAbsolutePath(absolutePath) {
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found filePath --> ${absolutePath}`);
    }

    let decipher;
    try {
        decipher = getFileDecipher();
    } catch (err) {
        throw new Error(`Failed to create decipher: ${err.message}`);
    }

    const readStream = fs.createReadStream(absolutePath);
    return {
        readStream,
        decipher
    };
}

fetchAttachmentsByEntity();