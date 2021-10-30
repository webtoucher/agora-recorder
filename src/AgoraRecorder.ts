import AgoraRecorderSdk, { AgoraRecorderEvent, AgoraVideoMixingLayout } from 'agora-recorder-sdk'
import AgoraAccessToken from 'agora-access-token'
import path from 'path'
import fs, { promises as fsPromises } from 'fs'
import EventEmitter from 'events'
import { format as formatDate } from 'fecha'

const { RtcRole, RtcTokenBuilder } = AgoraAccessToken;

export { AgoraVideoMixingLayout }

export interface AgoraRecorderConfig {

    /**
     * Agora application ID.
     * It can be found on the project settings page.
     * @see https://console.agora.io/projects
     * @see https://docs.agora.io/en/Recording/token?platform=Linux
     */
    appId: string

    /**
     * Agora application certificate.
     * It can be found on the project settings page.
     * @see https://console.agora.io/projects
     * @see https://docs.agora.io/en/Recording/token?platform=Linux
     */
    certificate: string

    /**
     * The name of the channel to be recorded.
     */
    channel: string,

    /**
     * The user account of the recording server.
     * @default agora-recorder
     */
    account?: string

    /**
     * Root directory for storing all videos and logs.
     * @default output
     */
    outputDir?: string,

    /**
     * Closure for building name of the subdirectory for storing current channel videos and logs.
     * @default ({ channel, date }) => `${formatDate(date, 'YYYY-MM-DD')}/${formatDate(date, 'HH:mm:ss')} ${channel}`
     */
    recordDirTmpl?: ({ channel, date }: { channel: string, date: Date }) => string,
}

export default class AgoraRecorder extends EventEmitter {
    private sdk: AgoraRecorderSdk
    private readonly date: Date

    constructor(private config: AgoraRecorderConfig) {
        super()
        if (!config.account) {
            config.account = 'agora-recorder'
        }
        if (!config.outputDir) {
            config.outputDir = 'output'
        }
        if (!config.recordDirTmpl) {
            config.recordDirTmpl = ({ channel, date }) => `${formatDate(date, 'YYYY-MM-DD')}/${formatDate(date, 'HH:mm:ss')} ${channel}`
        }
        this.date = new Date()

        fs.mkdirSync(this.recordPath, { recursive: true })
        this.sdk = new AgoraRecorderSdk()
        this.initEventHandler()
    }

    /**
     * The name of the channel to be recorded.
     */
    get channel(): string {
        return this.config.channel
    }

    /**
     * Full path of the directory for storing current channel videos and logs.
     */
    get recordPath(): string {
        return path.resolve(this.config.outputDir, this.config.recordDirTmpl({
            channel: this.config.channel,
            date: this.date,
        }))
    }

    initEventHandler(): void {
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_JOIN_CHANNEL, (channel: string, uid: string) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_JOIN_CHANNEL, channel, uid)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_LEAVE_CHANNEL, () => {
            this.emit(AgoraRecorderEvent.REC_EVENT_LEAVE_CHANNEL)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_ERROR, (err: number, statCode: number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_ERROR, err, statCode)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_USER_JOIN, (uid: string | number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_USER_JOIN, uid)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_USER_LEAVE, (uid: string | number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_USER_LEAVE, uid)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_ACTIVE_SPEAKER, (uid: string | number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_ACTIVE_SPEAKER, uid)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_CONN_LOST, () => {
            this.emit(AgoraRecorderEvent.REC_EVENT_CONN_LOST)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_CONN_INTER, () => {
            this.emit(AgoraRecorderEvent.REC_EVENT_CONN_INTER)
        })
        this.sdk.on(
            AgoraRecorderEvent.REC_EVENT_STREAM_CHANGED,
            (receivingAudio: boolean, receivingVideo: boolean) => {
                this.emit(AgoraRecorderEvent.REC_EVENT_STREAM_CHANGED, receivingAudio, receivingVideo)
            }
        )
        this.sdk.on(
            AgoraRecorderEvent.REC_EVENT_FIRST_VIDEO_FRAME,
            (uid: string | number, width: number, height: number, elapsed: number) => {
                this.emit(AgoraRecorderEvent.REC_EVENT_FIRST_VIDEO_FRAME, uid, width, height, elapsed)
            }
        )
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_FIRST_AUDIO_FRAME, (uid: string | number, elapsed: number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_FIRST_AUDIO_FRAME, uid, elapsed)
        })
        this.sdk.on(
            AgoraRecorderEvent.RTC_EVENT_AUDIO_VOLUME_INDICATION,
            (speakers: string, speakerNum: number) => {
                this.emit(AgoraRecorderEvent.RTC_EVENT_AUDIO_VOLUME_INDICATION, speakers, speakerNum)
            }
        )
        this.sdk.on(
            AgoraRecorderEvent.REC_EVENT_REMOTE_VIDEO_STREAM_STATE_CHANGED,
            (uid: string | number, state: number, reason: number) => {
                this.emit(AgoraRecorderEvent.REC_EVENT_REMOTE_VIDEO_STREAM_STATE_CHANGED, uid, state, reason)
            }
        )
        this.sdk.on(
            AgoraRecorderEvent.REC_EVENT_REMOTE_AUDIO_STREAM_STATE_CHANGED,
            (uid: string | number, state: number, reason: number) => {
                this.emit(AgoraRecorderEvent.REC_EVENT_REMOTE_AUDIO_STREAM_STATE_CHANGED, uid, state, reason)
            }
        )
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_REJOIN_SUCCESS, (channel: string, uid: string | number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_REJOIN_SUCCESS, channel, uid)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_CONN_STATE_CHANGED, (state: number, reason: number) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_CONN_STATE_CHANGED, state, reason)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_REMOTE_VIDEO_STATS, (uid: string | number, stats: any) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_REMOTE_VIDEO_STATS, uid, stats)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_REMOTE_AUDIO_STATS, (uid: string | number, stats: any) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_REMOTE_AUDIO_STATS, uid, stats)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_RECORDING_STATS, (stats: any) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_RECORDING_STATS, stats)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_LOCAL_USER_REGISTER, (uid: string | number, account: string) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_LOCAL_USER_REGISTER, uid, account)
        })
        this.sdk.on(AgoraRecorderEvent.REC_EVENT_USER_INFO_UPDATED, (uid: string | number, info: any) => {
            this.emit(AgoraRecorderEvent.REC_EVENT_USER_INFO_UPDATED, uid, info)
        })
    }

    /**
     * Starts to listen the channel and record video.
     */
    async start(): Promise<boolean> {
        const json = {
            Recording_Dir: this.recordPath,
        }
        const cfgPath = path.join(json.Recording_Dir, '/cfg.json')
        await fsPromises.writeFile(cfgPath, JSON.stringify(json))
        this.sdk.joinChannel(
            this.config.appId,
            RtcTokenBuilder.buildTokenWithAccount(
                this.config.appId,
                this.config.certificate,
                this.config.channel,
                this.config.account,
                RtcRole.SUBSCRIBER,
                0
            ),
            this.config.channel,
            this.config.account,
            path.resolve('node_modules', '.bin'),
            cfgPath
        )
        return await new Promise((resolve, reject) => {
            this.once(AgoraRecorderEvent.REC_EVENT_JOIN_CHANNEL, () => {
                resolve(true)
            })
            this.once(AgoraRecorderEvent.REC_EVENT_ERROR, (err) => {
                reject(err)
            })
        })
    }

    /**
     * Stops to listen the channel.
     */
    stop(): void {
        this.sdk.leaveChannel()
        this.sdk.release()
    }

    /**
     * Sets mix layout.
     */
    setMixLayout(layout: AgoraVideoMixingLayout): void {
        this.sdk.setMixLayout(layout)
    }
}
