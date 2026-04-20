const os = require("os");
const path = require("path");
const fs = require("fs");

const sampleFilesDir = path.join(__dirname, "sample-files");
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

const joinedPath = path.join(sampleFilesDir, "folder", "file.txt");

// OS module
console.log("Platform:", os.platform());
console.log("CPU:", os.cpus()[0].model);
console.log("Total Memory:", os.totalmem());

// Path module
console.log("Joined path:", joinedPath);
// fs.promises API
fs.promises
  .writeFile(sampleFilesDir + "/demo.txt", "Hello from fs.promises!")
  .then(() => {
    return fs.promises.readFile(sampleFilesDir + "/demo.txt", "utf-8");
  })
  .then((data) => {
    console.log("fs.promises read:", data);
  })
  .catch((err) => {
    console.log("Error:", err);
  });
// Streams for large files- log first 40 chars of each chunk
const createLargeFile = async () => {
  try {
    let fileContent = "";
    for (let i = 0; i < 100; i++) {
      fileContent += `This is line ${i + 1} in a large file. \n`;
    }
    await fs.promises.writeFile(sampleFilesDir + "/largefile.txt", fileContent);
    // console.log("File created");

    // const data = await fs.promises.readFile(
    //   sampleFilesDir + "/largefile.txt",
    //   "utf-8",
    // );

    // console.log("File content:", data);

    const readStream = fs.createReadStream(sampleFilesDir + "/largefile.txt", {
      encoding: "utf-8",
      highWaterMark: 1024,
    });

    readStream.on("data", (chunk) => {
      // console.log("Chunk size:", chunk.length, "characters");
      console.log("Read chunk:", chunk.slice(0, 40));
    });

    readStream.on("end", () => {
      console.log("Finished reading large file with streams.");
    });
  } catch (err) {
    console.log(err);
  }
};

createLargeFile();
