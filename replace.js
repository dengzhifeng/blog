/*
 * @description:
 * @author: steve.deng
 * @Date: 2021-04-28 09:44:06
 * @LastEditors: steve.deng
 * @LastEditTime: 2021-04-28 09:44:25
 */
#!/usr/bin/env node

/**
 * Module dependencies.
 */
const { Command } = require("commander");
const program = new Command();
const cp = require("child_process");
const util = require("util");
const exec = util.promisify(cp.exec);
const path = require("path");
// const chalk = require("chalk");
// const inquirer = require("inquirer");
const { version } = require("./package.json");
// const {
//     format_time,
//     copyToClipboard,
//     successLog,
//     errorLog,
//     log
// } = require('./utils.js')

let environmental = "test",
  name = "";
let packageJson = {};

function resolve(pathname) {
  return path.resolve(process.cwd(), pathname);
}

try {
  packageJson = require(resolve("package.json"));
  name = packageJson.name;
} catch (error) {}

program
  .version(`v${version}`)
  .description(`这是一个命令行工具 版本v${version}`)
  .option("-file,--file [name]", "send your file")
  .option("-newfile,--newfile [name]", "send your newfile");

program.on("--help", function () {
  console.log("");
  console.log("Examples:");
  console.log("  $ custom-help --help");
  console.log("  $ custom-help -h");
});

//替换文件
// error on unknown commands
program
  .command("auto-replace-file")
  .description("run auto-replace-file for repalce file")
  .action(async function (env, options) {
    try {
      const file = program.file || "package.json";
      const newfile = program.newfile || "rf-package.json";
      await exec(`cp -f ${resolve(newfile)} ${resolve(file)}`);
      console.log("配置文件替换");
    } catch (error) {
      console.log("command push---->", error);
    }
  });

//构建项目
// error on unknown commands
// program
//     .command('push [env]')
//     .option('-m, --message <message>', 'replace file')
//     .option('-r, --replace <replace>', 'replace file')
//     .option('-p, --push <push>', 'push file')
//     .description('run push commands for all envs')
//     .action(async function (env, options) {
//         try {
//             const replace = options.replace;
//             const push = options.push;
//             const file = program.file || 'package.json';
//             const newfile = program.newfile || 'rf-package.json';
//             if (replace) {
//                 await exec(`cp -f ${resolve(newfile)} ${resolve(file)}`);
//                 console.log('配置文件替换');
//             }
//             console.log('代码提交中···')
//             const tagName = `${format_time(new Date().getTime(), 'yyyy-MM-dd-hh:mm:ss')}`;
//             const message = options.message || `feat:${tagName}`
//             await exec(`git init`)
//             await exec(`git add .`)
//             await exec(`git stash`)
//             await exec(`git pull origin`)
//             await exec(`git stash pop`)
//             await exec(`git add .`)
//             await exec(`git commit -m ${message}`).catch(error => {
//                 console.log('commit---->', error)
//             })
//             await exec(`git push origin`)
//             console.log('代码提交成功')
//         } catch (error) {
//             console.log('command push---->', error)
//         }
//     })

//serve
// error on unknown commands
//配置启动一个静态资源服务器
program
  .command("auto-serve [env]")
  .description("run auto-serve commands for all envs")
  .option("-p, --port <port>", "Which exec port to use")
  .option("-d, --dir <dir>", "Which exec dir to use")
  .action(async function (env, options) {
    try {
      const port = options.port || "8009";
      const dir = options.dir || "";
      // console.log('options---->', options, env);
      console.log("exc---->", `anywhere -p ${port} -d ${dir}`);
      await exec(`anywhere -p ${port} -d ${dir}`);
    } catch (error) {
      console.log("auto-serve anywhere---->", error);
      console.log("如未安装anywhere请自行安装 npm i anywhere -g");
    }
  });

program.parse(process.argv);
