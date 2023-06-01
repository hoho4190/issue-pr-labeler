class InputInfo {
  githubEventPath: string
  token: string
  disableBot: boolean
  configFileName: string

  constructor(
    githubEventPath: string,
    token: string,
    disableBot: boolean,
    configFileName: string
  ) {
    this.githubEventPath = githubEventPath
    this.token = token
    this.disableBot = disableBot
    this.configFileName = configFileName
  }
}

export {InputInfo}
