const child = require("child_process");
const fs = require("fs");

// GET COMMITS SINCE LATEST TAG
const latestTag = child
    .execSync('git describe --long')
    .toString('utf-8')
    .split('-')[0];
const commits = child
    .execSync(`git log ${latestTag}..HEAD --format=%B%H----DELIMITER----`)
    .toString("utf-8")
    .split("----DELIMITER----\n")
    .map(commit => {
        const [message, sha] = commit.split("\n");
        return { sha, message };
    })
    .filter(commit => Boolean(commit.sha));

// GET CHANGELOG.md CHANGES
const features = [];
const chores = [];
commits
    .forEach(commit => {
        if (commit.message.startsWith("feature: ")) {
            features.push(`* ${commit.message.replace("feature: ", "")} ([${commit.sha.substring(0, 6)}](https://github.com/EduardBargues/changelog-generator/commit/${commit.sha}))\n`);
        }
        if (commit.message.startsWith("chore: ")) {
            chores.push(`* ${commit.message.replace("chore: ", "")} ([${commit.sha.substring(0, 6)}](https://github.com/EduardBargues/changelog-generator/commit/${commit.sha}))\n`);
        }
    });

// UPDATE CHANGELOG.md
const currentVersion = Number(require("./package.json").version);
const newVersion = currentVersion + 1; // NO SEMVER TO SIMPLIFY
let newChangelog = `# Version ${newVersion} (${new Date().toISOString().split("T")[0]})\n\n`;
if (features.length) {
    newChangelog += `## Features\n`;
    features.forEach(feature => {
        newChangelog += feature;
    });
    newChangelog += '\n';
}
if (chores.length) {
    newChangelog += `## Chores\n`;
    chores.forEach(chore => {
        newChangelog += chore;
    });
    newChangelog += '\n';
}
const currentChangelog = fs.readFileSync("./CHANGELOG.md", "utf-8");
fs.writeFileSync("./CHANGELOG.md", `${newChangelog}${currentChangelog}`);

// UPDATE VERSION (package.json)
fs.writeFileSync("./package.json", JSON.stringify({ version: String(newVersion) }, null, 2));

// NEW COMMIT UPDATING VERSION
child.execSync('git add .');
child.execSync(`git commit -m "chore: Bump to version ${newVersion}"`);

// TAG THE NEW COMMIT
child.execSync(`git tag -a -m "Tag for version ${newVersion}" version${newVersion}`);