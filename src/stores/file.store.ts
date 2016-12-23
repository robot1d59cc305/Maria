import { observable, action, computed, runInAction } from 'mobx'
import { aria2Store, Aria2Status } from '../stores/aria2.store'
import {
  Intent
} from '@blueprintjs/core'

export function computedProgress(completed: number, total: number) {
  return parseFloat((completed / total).toFixed(3))
}

export function toFixed(num: number, count: number = 2) {
  return num.toFixed(count)
}

export function parseSize(byte: string, hex: number = 1000): string {
  const byteNum = Number(byte)
  if (byteNum < hex) {
    return `${toFixed(byteNum, 0)}B`
  } else if (byteNum > hex && byteNum < hex * hex) {
    return `${toFixed(byteNum / hex, 0)}KB`
  } else if (byteNum > hex * hex) {
    return `${toFixed(byteNum / hex / hex, 0)}MB`
  } else {
    return `${toFixed(byteNum / hex / hex / hex, 0)}GB`
  }
}

export enum DOWNLOAD_STATUS {
  WAITING, PAUSED, ACTIVE, ERROR, COMPLETE, REMOVED
}

export class FileStore {
  private interval: number
  @observable file: Aria2File

  constructor(file: Aria2File) {
    this.file = file
    this.startListen()
  }

  @computed get progressBarIntent() {
    switch (this.file.status) {
      case 'active':
        return Intent.SUCCESS
      case 'paused':
      case 'waiting':
      case 'removed':
        return Intent.NONE
      case 'error':
        return Intent.DANGER
      default:
        return Intent.NONE
    }
  }

  @action onDoubleClickFile = () => {
    console.log(this.file)
    if (this.file.status !== 'active') {
      this.start()
    } else {
      this.pause()
    }
  }

  @action start = async () => {
    await aria2Store.aria2.unpause(this.file.gid)
    this.startListen()
  }

  @action pause = async () => {
    await aria2Store.aria2.pause(this.file.gid)
    this.stopListen()
  }

  @action startListen = (delay: number = 1000) => {
    const updateFile = async () => {
      const file = await aria2Store.aria2.tellStatus(this.file.gid)
      runInAction('update file status', () => {
        this.file = file
        if (this.file.status === 'completed') {
          this.stopListen()
        }
      })
    }
    if (aria2Store.status === Aria2Status.OPENED) {
      updateFile()
      this.interval = setInterval(updateFile, delay)
    }
  }

  @action stopListen = () => {
    clearInterval(this.interval)
  }

  @action setProgress = () => {
    this.file.completedLength += 1
  }

  @computed get fileSize(): string {
    return parseSize(this.file.totalLength)
  }

  @computed get downloadSpeed () {
    return parseSize(this.file.downloadSpeed)
  }

  @computed get progress(): number {
    return computedProgress(Number(this.file.completedLength), Number(this.file.totalLength))
  }
}
