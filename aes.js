const os = require("os");
const {
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  randomBytes
} = require("crypto");
const { createReadStream, createWriteStream, mkdirSync } = require("fs");
const fs = require("fs");
const path = require("path");
const streamifier = require("streamifier");

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

const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ALGORITHM = "aes-256-cbc";
const pdb = new Rfc2898DeriveBytes(
  "MAKV2SPBNI99212",
  Buffer.from([
    0x49, 0x76, 0x61, 0x6e, 0x20, 0x4d, 0x65, 0x64, 0x76, 0x65, 0x64, 0x65, 0x76
  ])
);
const FILE_ENCRYPTION_KEY = pdb.getBytes(KEY_LENGTH + IV_LENGTH);
const STRING_ENCRYPTION_KEY = "vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3";

function encryptString(inputText) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(STRING_ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(inputText);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptString(inputText) {
  const textParts = inputText.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(STRING_ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function encryptFile(inputFileContent, outputFilePath) {
  try {
    const readStream = streamifier.createReadStream(
      Buffer.from(inputFileContent)
    );
    const key = FILE_ENCRYPTION_KEY.slice(0, KEY_LENGTH);
    const iv = FILE_ENCRYPTION_KEY.slice(KEY_LENGTH, KEY_LENGTH + IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const writeStream = createWriteStream(outputFilePath);
    cipher.on("error", (err) => {
      console.log("cipher error!", err);
    });
    writeStream.on("close", () => {
      console.log("Encryption success!");
    });
    writeStream.on("error", (err) => {
      console.log("write stream ERROR", err);
    });
    readStream.pipe(cipher).pipe(writeStream);
  } catch (err) {
    console.log("ERROR_ENCRYPT", err);
  }
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

function decryptFile(inputFilePath) {
  const separator = os.platform() === "win32" ? "\\" : "/";

  return new Promise(function (resolve, reject) {
    try {
      const [fileNameWithExtension] = inputFilePath
        .split(`${separator}`)
        .reverse();
      let directoryPath = inputFilePath.split(`${separator}`);
      directoryPath.pop();
      directoryPath = directoryPath.join(`${separator}`);
      const outputFilePath = path.join(
        path.resolve(`${directoryPath}/decrypted/${fileNameWithExtension}`)
      );
      if (!fs.existsSync(path.resolve(`${directoryPath}/decrypted`))) {
        mkdirSync(path.resolve(`${directoryPath}/decrypted`), {
          recursive: true
        });
      }

      const readStream = createReadStream(inputFilePath);
      const key = FILE_ENCRYPTION_KEY.slice(0, KEY_LENGTH);
      const iv = FILE_ENCRYPTION_KEY.slice(KEY_LENGTH, KEY_LENGTH + IV_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      const writeStream = createWriteStream(outputFilePath);
      readStream.pipe(decipher).pipe(writeStream);
      decipher.on("error", (err) => {
        console.log("Decipher failed to decrypt the file!");
        decipher.end();
        writeStream.end();
        reject(err);
      });

      writeStream.on("error", (err) => {
        console.log("Decryption failed!");
        decipher.end();
        writeStream.end();
        reject(err);
      });

      writeStream.on("close", () => {
        decipher.end();
        writeStream.end();
        resolve(outputFilePath);
      });
    } catch (exc) {
      reject(exc);
    }
  });
}

function getDecryptedReadableStream(fileAbsolutePath) {
  const readStream = createReadStream(fileAbsolutePath);
  const key = FILE_ENCRYPTION_KEY.slice(0, KEY_LENGTH);
  const iv = FILE_ENCRYPTION_KEY.slice(KEY_LENGTH, KEY_LENGTH + IV_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  return readStream.pipe(decipher);
}

module.exports = {
  encryptString,
  decryptString,
  encryptFile,
  decryptFile,
  getDecryptedReadableStream,
  decryptFileByAbsolutePath
};
