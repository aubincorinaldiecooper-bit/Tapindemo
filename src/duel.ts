import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client'
import { useEffect, useRef, useState } from 'react'
import type { DuelAccess } from './protocol'

export type DuelStatus = 'idle' | 'connecting' | 'live' | 'no-camera' | 'error'

// Joins the party's LiveKit room while a head-to-head card is up. Duelists publish camera + mic;
// everyone else only watches. Tears down when the card changes.
export function useDuelVideo(active: boolean, cardId: number, publish: boolean, getAccess: () => Promise<DuelAccess | null>) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<DuelStatus>('idle')
  const [remoteTrack, setRemoteTrack] = useState<RemoteTrack | null>(null)
  const [attempt, setAttempt] = useState(0)

  // The rival's tile mounts only once their video arrives, so attach after that render, not on subscribe.
  useEffect(() => {
    if (remoteTrack && remoteRef.current) remoteTrack.attach(remoteRef.current)
  }, [remoteTrack])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let retry: number | undefined
    const room = new Room({ adaptiveStream: true, dynacast: true })
    const attachRemote = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video) setRemoteTrack(track)
      if (track.kind === Track.Kind.Audio) track.attach()
    }
    room.on(RoomEvent.TrackSubscribed, attachRemote)
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach()
      if (track.kind === Track.Kind.Video) setRemoteTrack((t) => (t === track ? null : t))
    })
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      setStatus('connecting')
      const access = await getAccess()
      if (cancelled) return
      if (!access) {
        setStatus('error')
        retry = window.setTimeout(() => setAttempt((n) => n + 1), 4000)
        return
      }
      try {
        await room.connect(access.url, access.token)
        for (const p of room.remoteParticipants.values()) for (const pub of p.trackPublications.values()) if (pub.track) attachRemote(pub.track)
        if (publish) {
          try {
            await room.localParticipant.enableCameraAndMicrophone()
            const cam = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
            if (cam && localRef.current) cam.attach(localRef.current)
          } catch {
            if (!cancelled) setStatus('no-camera')
            return
          }
        }
        if (!cancelled) setStatus('live')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      window.clearTimeout(retry)
      setRemoteTrack(null)
      room.disconnect()
    }
  }, [active, cardId, publish, getAccess, attempt])

  return { localRef, remoteRef, status: active ? status : 'idle', remoteLive: active && remoteTrack !== null }
}
