module.exports = {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    [
      "@semantic-release/exec",
      {
        // Run the build
        prepareCmd: "npm run build",
      },
    ],
    "@semantic-release/npm",
    "@semantic-release/github",
    "@semantic-release/git",
  ],
};
