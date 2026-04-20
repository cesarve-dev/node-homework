const fs = require("fs");
// const path = require("path");

// Write a sample file for demonstration
// 1. Callback style
fs.writeFile(
  "assignment1/sample-files/sample.txt",
  "Hello, async world!",
  (err) => {
    if (err) throw err;
    // console.log("File created successfully!");

    fs.readFile(
      "assignment1/sample-files/sample.txt",
      "utf-8",
      (error, data) => {
        if (error) {
          console.log(error);
          return;
        }
        console.log("Callback read:", data);
      },
    );
  },
);

// Callback hell example (test and leave it in comments):
// fs.writeFile(
//   "assignment1/sample-files/sample.txt",
//   "Hello, async world!",
//   (err) => {
//     if (err) throw err;
//     console.log("File created successfully!");

//     // 1. Callback style
//     fs.readFile(
//       "assignment1/sample-files/sample.txt",
//       "utf-8",
//       (error, data) => {
//         if (error) {
//           console.log(error);
//           return;
//         }
//         console.log(data);

//         //first floor
//         fs.writeFile(
//           "assignment1/sample-files/sample2.txt",
//           "Hello, async again!",
//           (error) => {
//             if (error) throw error;
//             console.log("File created successfully 2");

//             fs.readFile(
//               "assignment1/sample-files/sample2.txt",
//               "utf-8",
//               (error, data) => {
//                 if (error) {
//                   console.log(error);
//                   return;
//                 }
//                 console.log(data);

//                 //second floor
//                 fs.writeFile(
//                   "assignment1/sample-files/sample3.txt",
//                   "Hello, async again again!",
//                   (error) => {
//                     if (error) throw error;
//                     console.log("File created successfully 3");

//                     fs.readFile(
//                       "assignment1/sample-files/sample3.txt",
//                       "utf-8",
//                       (error, data) => {
//                         if (error) {
//                           console.log(error);
//                           return;
//                         }
//                         console.log(data);

//                         //third floor
//                         fs.writeFile(
//                           "assignment1/sample-files/sample4.txt",
//                           "Hello, async again again and again!",
//                           (error) => {
//                             if (error) throw error;
//                             console.log("File created successfully 4");

//                             fs.readFile(
//                               "assignment1/sample-files/sample4.txt",
//                               "utf-8",
//                               (error, data) => {
//                                 if (error) {
//                                   console.log(error);
//                                   return;
//                                 }
//                                 console.log(data);

//                                 //fourth floor
//                               },
//                             );
//                           },
//                         );
//                       },
//                     );
//                   },
//                 );
//               },
//             );
//           },
//         );
//       },
//     );
//   },
// );
// 2. Promise style
fs.promises
  .writeFile("assignment1/sample-files/sample.txt", "Hello, async world!")
  .then(() => {
    // console.log("File successfully created. Promise style.");
    return fs.promises.readFile("assignment1/sample-files/sample.txt", "utf8");
  })
  .then((data) => {
    console.log("Promise read:", data);
  })
  .catch((error) => {
    console.log("Error: ", error);
  });

// 3. Async/Await style
const asyncFunction = async () => {
  try {
    await fs.promises.writeFile(
      "assignment1/sample-files/sample.txt",
      "Hello, async world!",
    );
    // console.log("File succesfully created. Async style");

    const data = await fs.promises.readFile(
      "assignment1/sample-files/sample.txt",
      "utf8",
    );
    console.log("Async/Await:", data);
  } catch (error) {
    console.log(error);
  }
};

asyncFunction();
