const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

describe('Week 1 Assignment Solution Tests', () => {
  const assignmentDir = path.join(__dirname, '../assignment1');
  const sampleFilesDir = path.join(assignmentDir, 'sample-files');

  test('globals-demo.js outputs correct globals', () => {
    const scriptPath = path.join(assignmentDir, 'globals-demo.js');
    const output = execSync(`node ${scriptPath}`).toString();
    expect(output).toContain(`__dirname: ${assignmentDir}`);
    expect(output).toContain(`__filename: ${scriptPath}`);
    expect(output).toMatch(/Process ID:/);
    expect(output).toMatch(/Platform:/);
    expect(output).toMatch(/Custom global variable: Hello, global!/);
  });

  test('async-demo.js demonstrates async patterns and file operations', () => {
    // Remove sample.txt if it exists
    const sampleTxt = path.join(sampleFilesDir, 'sample.txt');
    if (fs.existsSync(sampleTxt)) fs.unlinkSync(sampleTxt);
    const output = execSync(`node ${path.join(assignmentDir, 'async-demo.js')}`).toString();

    // Check that the file was created and contains the expected content
    expect(fs.existsSync(sampleTxt)).toBe(true);
    const fileContent = fs.readFileSync(sampleTxt, 'utf8');
    expect(fileContent.trim()).toBe('Hello, async world!');

    // Check for callback pattern (case-insensitive, flexible message)
    expect(output).toMatch(/callback[^\n]*hello, async world!/i);
    // Check for promise pattern
    expect(output).toMatch(/promise[^\n]*hello, async world!/i);
    // Check for async/await pattern
    expect(output).toMatch(/async[^\n]*await[^\n]*hello, async world!/i);

    // Ensure no error logs for normal operation
    expect(output).not.toMatch(/error/i);
  });

  test('core-modules-demo.js uses os, path, fs.promises, and streams', () => {
    const demoTxt = path.join(sampleFilesDir, 'demo.txt');
    const largeFile = path.join(sampleFilesDir, 'largefile.txt');
    // Remove files if they exist
    if (fs.existsSync(demoTxt)) fs.unlinkSync(demoTxt);
    if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile);
    const output = execSync(`node ${path.join(assignmentDir, 'core-modules-demo.js')}`).toString();
    // OS module output
    expect(output).toMatch(/Platform:/);
    expect(output).toMatch(/CPU:/);
    expect(output).toMatch(/Total Memory:/);
    // Path module output
    expect(output).toMatch(/Joined path:/);
    // fs.promises output
    expect(output).toMatch(/fs\.promises read:/);
    // Streams output: should see at least one chunk and the end message
    expect(output).toMatch(/Read chunk:/);
    expect(output).toMatch(/Finished reading large file with streams/);
    // demo.txt should exist after script runs
    expect(fs.existsSync(demoTxt)).toBe(true);
    // If largefile.txt exists, it should have at least one line
    if (fs.existsSync(largeFile)) {
      const lines = fs.readFileSync(largeFile, 'utf8').split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
    }
  });
}); 