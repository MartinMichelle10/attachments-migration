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

const BASE_DIR = path.join(__dirname, 'att');

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

    // Fetch all entities
    const entities = await db('LKEntityStucture').select('ID', 'Name');

    // Process each entity in parallel with controlled concurrency
    await Promise.map(
      entities,
      async (entity) => {
        console.log(`Processing Entity: ${entity.Name}`);
        // Fetch users associated with the entity
        const users = await db('Users')
          .select('ID')
          .where('EntityID', entity.ID);

        if (users.length === 0) return;

        const userIds = users.map((user) => user.ID);

        const correspondences = await db('Correspondences')
          .select('ID', 'Subject', 'CreatorUserID')
          .whereIn('CreatorUserID', userIds);

        let entityFolderPath = null

        if (correspondences.length > 0) {
          entityFolderPath = await createFolderStructure(BASE_DIR, entity.Name);


          await Promise.map(
            correspondences,
            async (correspondence) => {
              const correspondenceAttachmentsPromise = db('CorrespondenceAttachmentLookup')
                .join('Attachments', 'CorrespondenceAttachmentLookup.AttachmentID', 'Attachments.ID')
                .select('Attachments.*')
                .where('CorrespondenceAttachmentLookup.CorrespondenceID', correspondence.ID);

              const taskAttachmentsPromise = db('Tasks')
                .join('TaskAttachmentLookup', 'Tasks.ID', 'TaskAttachmentLookup.TaskID')
                .join('Attachments', 'TaskAttachmentLookup.AttachmentID', 'Attachments.ID')
                .select('Attachments.*')
                .where('Tasks.CorrespondenceID', correspondence.ID);

              const commentAttachmentsPromise = db('CorrespondenceComments')
                .join('CommentsAttachmentLookup', 'CorrespondenceComments.ID', 'CommentsAttachmentLookup.CommentID')
                .join('Attachments', 'CommentsAttachmentLookup.AttachmentID', 'Attachments.ID')
                .select('Attachments.*')
                .where('CorrespondenceComments.CorrespondenceID', correspondence.ID);

                const historyAttachmentsPromise = db('Tasks')
                .join('TaskHistoryAssignment', 'Tasks.ID', 'TaskHistoryAssignment.TaskId')
                .join('TaskHistory', 'TaskHistoryAssignment.TaskHistoryId', 'TaskHistory.ID')
                .join('TaskHistoryAttachment', 'TaskHistory.ID', 'TaskHistoryAttachment.TaskHistoryId')
                .join('Attachments', 'TaskHistoryAttachment.AttachmentId', 'Attachments.ID')
                .select('Attachments.*')
                .where('Tasks.CorrespondenceID', correspondence.ID);


              const [correspondenceAttachments, taskAttachments, comments, TaskHistory] = await Promise.all([
                correspondenceAttachmentsPromise,
                taskAttachmentsPromise,
                commentAttachmentsPromise,
                historyAttachmentsPromise
              ]);

              if (correspondenceAttachments.length > 0 || taskAttachments.length > 0 || comments.length > 0 ||TaskHistory.length > 0) {
                const correspondenceFolderPath = await createFolderStructure(
                  entityFolderPath,
                  correspondence.Subject || `Correspondence_${correspondence.ID}`
                );

                await Promise.all([
                  saveAttachments(
                    correspondenceFolderPath,
                    '',
                    [...correspondenceAttachments, ...taskAttachments, ...comments, ...TaskHistory],
                    SOURCE_FOLDER
                  )
                ]);
              }

              console.log(`Processed Correspondence: ${correspondence.Subject || correspondence.ID}`);
            },
            { concurrency: 5 }
          );
        }

        console.log(`Entity "${entity.Name}" processed.`);
      },
      { concurrency: 3 }
    );

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