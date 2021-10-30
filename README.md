# Agora Recorder

Recording library for Agora.io stream service.

## Prerequisites
- Agora Account
- Ubuntu 12.04+ x64 or CentOS 6.5+ x64 (CentOS 7+ recommended)
- GCC 4.4+
- ARS IP (public IP)
- 1MB+ bandwidth for each simultaneous recording channel
- Server access for `qos.agoralab.co`
- NodeJS 14+

  **Note:** If server access is denied, the Agora SDK may fail to transfer the required data.

## Quick Start
### Background Knowledge
This project presumes you have basic ideas of how Agora Recording SDK works.

### Installation
This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 14 or higher is required.

If this is a brand new project, make sure to create a `package.json` first with
the [`npm init` command](https://docs.npmjs.com/creating-a-package-json-file).

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install agora-recorder
```

### Demo
See [example project](https://github.com/webtoucher/agora-recorder-example).

## Resources
- See full API documentation in the [Document Center](https://docs.agora.io/en/)

## License
This software is licensed under the BSD 3-Clause License. [View the license](LICENSE.md).
