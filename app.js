const knex = require('knex');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SOURCE_FOLDER = process.env.SOURCE_FOLDER_PATH;

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
    const sourceFilePath = path.join(sourceFolder, attachment.Path); // Full path of the source file
    const targetFilePath = path.join(typeFolderPath, `${attachment.FileName || `Attachment_${attachment.ID}`}`);

    try {
      if (fs.existsSync(sourceFilePath)) {
        fs.copyFileSync(sourceFilePath, targetFilePath); // Copy file from source to target
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

    for (const entity of entities) {
      console.log(`Processing Entity: ${entity.Name}`);

      // Create folder for the entity
      const entityFolderPath = await createFolderStructure(BASE_DIR, entity.Name);

      // Fetch users associated with the entity
      const users = await db('Users')
        .select('ID')
        .where('EntityID', entity.ID);

      if (users.length === 0) continue;

      const userIds = users.map((user) => user.ID);

      // Fetch Correspondences and create folders for each
      const correspondences = await db('Correspondences')
        .select('ID', 'Subject', 'CreatorUserID')
        .whereIn('CreatorUserID', userIds);

      for (const correspondence of correspondences) {

        // Fetch and save Correspondence Attachments
        const correspondenceAttachments = await db('CorrespondenceAttachmentLookup')
          .join('Attachments', 'CorrespondenceAttachmentLookup.AttachmentID', 'Attachments.ID')
          .select('Attachments.*')
          .where('CorrespondenceAttachmentLookup.CorrespondenceID', correspondence.ID);

        // Fetch and save Task Attachments related to this Correspondence
        const taskAttachments = await db('Tasks')
          .join('TaskAttachmentLookup', 'Tasks.ID', 'TaskAttachmentLookup.TaskID')
          .join('Attachments', 'TaskAttachmentLookup.AttachmentID', 'Attachments.ID')
          .select('Attachments.*')
          .where('Tasks.CorrespondenceID', correspondence.ID);

        if (correspondenceAttachments.length > 0 || taskAttachments.length > 0) {
          const correspondenceFolderPath = await createFolderStructure(entityFolderPath, correspondence.Subject || `Correspondence_${correspondence.ID}`);
          await saveAttachments(correspondenceFolderPath, 'CorrespondenceAttachments', correspondenceAttachments, SOURCE_FOLDER);
          await saveAttachments(correspondenceFolderPath, 'TaskAttachments', taskAttachments, SOURCE_FOLDER);
        }

        console.log(`Processed Correspondence: ${correspondence.Subject || correspondence.ID}`);
      }

      console.log(`Entity "${entity.Name}" processed.`);
    }

    console.log('All entities processed successfully.');
  } catch (error) {
    console.error('Error fetching attachments:', error);
  } finally {
    await db.destroy(); // Close database connection
  }
}

// Execute the script
fetchAttachmentsByEntity();



/**
 * 
 * 
// Replace with your actual decryption key and algorithm
const DECRYPTION_KEY = Buffer.from('your-secret-key', 'hex'); // Replace with your encryption key
const DECRYPTION_ALGORITHM = 'aes-256-cbc'; // Replace with your encryption algorithm
const IV = Buffer.from('your-initialization-vector', 'hex'); // Replace with your IV

const BASE_DIR = path.join(__dirname, 'EntityAttachments');

async function createFolderStructure(basePath, entityName) {
  const entityPath = path.join(basePath, entityName);
  if (!fs.existsSync(entityPath)) {
    fs.mkdirSync(entityPath, { recursive: true });
  }
  return entityPath;
}

function decryptFile(sourcePath, destinationPath) {
  try {
    const decipher = crypto.createDecipheriv(DECRYPTION_ALGORITHM, DECRYPTION_KEY, IV);
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destinationPath);

    input.pipe(decipher).pipe(output);

    return new Promise((resolve, reject) => {
      output.on('finish', resolve);
      output.on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to decrypt file: ${sourcePath}`, error.message);
  }
}

async function saveAttachments(folderPath, attachmentType, attachments) {
  const typeFolderPath = path.join(folderPath, attachmentType);
  if (!fs.existsSync(typeFolderPath)) {
    fs.mkdirSync(typeFolderPath);
  }

  for (const attachment of attachments) {
    const sourcePath = attachment.SecuredPath;
    const destinationPath = path.join(typeFolderPath, attachment.FileName || `Attachment_${attachment.ID}`);
    await decryptFile(sourcePath, destinationPath);
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

    for (const entity of entities) {
      console.log(`Processing Entity: ${entity.Name}`);

      // Create folder for the entity
      const entityFolderPath = await createFolderStructure(BASE_DIR, entity.Name);

      // Fetch users associated with the entity
      const users = await db('Users')
        .select('ID')
        .where('EntityID', entity.ID);

      if (users.length === 0) continue;

      const userIds = users.map((user) => user.ID);

      // Fetch Correspondence Attachments
      const correspondenceAttachments = await db('Correspondences')
        .join('CorrespondenceAttachmentLookup', 'Correspondences.ID', 'CorrespondenceAttachmentLookup.CorrespondenceID')
        .join('Attachments', 'CorrespondenceAttachmentLookup.AttachmentID', 'Attachments.ID')
        .select('Attachments.*')
        .whereIn('Correspondences.CreatorUserID', userIds);

      await saveAttachments(entityFolderPath, 'CorrespondenceAttachments', correspondenceAttachments);

      // Fetch Task Attachments
      const taskAttachments = await db('Tasks')
        .join('TaskAttachmentLookup', 'Tasks.ID', 'TaskAttachmentLookup.TaskID')
        .join('Attachments', 'TaskAttachmentLookup.AttachmentID', 'Attachments.ID')
        .select('Attachments.*')
        .whereIn('Tasks.CreatorUserID', userIds);

      await saveAttachments(entityFolderPath, 'TaskAttachments', taskAttachments);

      // Fetch Comment Attachments
      const commentAttachments = await db('CorrespondenceComments')
        .join('CommentsAttachmentLookup', 'CorrespondenceComments.ID', 'CommentsAttachmentLookup.CommentID')
        .join('Attachments', 'CommentsAttachmentLookup.AttachmentID', 'Attachments.ID')
        .select('Attachments.*')
        .whereIn('CorrespondenceComments.UserID', userIds);

      await saveAttachments(entityFolderPath, 'CommentAttachments', commentAttachments);

      // Fetch Task History Attachments
      const taskHistoryAttachments = await db('TaskHistoryAttachment')
        .join('Attachments', 'TaskHistoryAttachment.AttachmentId', 'Attachments.ID')
        .join('Tasks', 'TaskHistoryAttachment.TaskHistoryId', 'Tasks.ID')
        .select('Attachments.*')
        .whereIn('Tasks.CreatorUserID', userIds);

      await saveAttachments(entityFolderPath, 'TaskHistoryAttachments', taskHistoryAttachments);

      console.log(`Entity "${entity.Name}" processed.`);
    }

    console.log('All entities processed successfully.');
  } catch (error) {
    console.error('Error fetching attachments:', error);
  } finally {
    await db.destroy(); // Close database connection
  }
}

// Execute the script
fetchAttachmentsByEntity();
 */