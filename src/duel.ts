import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client'
import { useEffect, useRef, useState } from 'react'
import type { DuelAccess } from './protocol'

export type DuelStatus = 'idle' | 'connecting' | 'live' | 'no-camera' | 'error'

// Joins the party's LiveKit room while a head-to-head card is up. Duelists publish camera + mic;
// everyone else only watches. Tears down when the card changes.
export function useDuelVideo(active: boolean, publish: boolean, getAccess: () => Promise<DuelAccess | null>) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<DuelStatus>('idle')

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    const attachRemote = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && remoteRef.current) track.attach(remoteRef.current)
      if (track.kind === Track.Kind.Audio) track.attach()
    }
    room.on(RoomEvent.TrackSubscribed, attachRemote)
    room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach())
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      setStatus('connecting')
      const access = await getAccess()
      if (!access || cancelled) return setStatus('error')
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
      room.disconnect()
    }
  }, [active, publish, getAccess])

  return { localRef, remoteRef, status: active ? status : 'idle' }
}
