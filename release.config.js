module.exports = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",

        releaseRules: [
          // catch-alls, in case commit messages do not follow conventional-commits
          { subject: "*", release: "minor" },
          { subject: null, release: "minor" },
        ],
      },
    ],
    ["@semantic-release/release-notes-generator", { preset: "conventionalcommits" }],
    "@semantic-release/npm",
    "@semantic-release/github",
    "@semantic-release/git",
  ],
};
