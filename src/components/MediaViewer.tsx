import React, { useState, useRef, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: 'image' | 'video' | 'audio'
  caption?: string
}

export default function MediaViewer({ isOpen, onClose, mediaUrl, mediaType, caption }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setZoom(1)
      setRotation(0)
      setIsPlaying(false)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 0.25, 5))
          break
        case '-':
          setZoom(prev => Math.max(prev - 0.25, 0.25))
          break
        case 'r':
        case 'R':
          setRotation(prev => (prev + 90) % 360)
          break
        case ' ':
          e.preventDefault()
          if (mediaType === 'video' && videoRef.current) {
            if (isPlaying) {
              videoRef.current.pause()
            } else {
              videoRef.current.play()
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, mediaType, isPlaying, onClose])

  const handleVideoPlay = () => {
    setIsPlaying(true)
  }

  const handleVideoPause = () => {
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) videoRef.current.volume = newVolume
    if (audioRef.current) audioRef.current.volume = newVolume
  }

  const downloadMedia = () => {
    const link = document.createElement('a')
    link.href = mediaUrl
    link.download = `media_${Date.now()}.${mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'mp3'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Header com controles */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          {mediaType === 'image' && (
            <>
              <button
                onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}
                className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                title="Diminuir zoom (-)"
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-white bg-black bg-opacity-50 px-3 py-1 rounded-lg">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(prev + 0.25, 5))}
                className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                title="Aumentar zoom (+)"
              >
                <ZoomIn size={20} />
              </button>
              <button
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                title="Rotacionar (R)"
              >
                <RotateCw size={20} />
              </button>
            </>
          )}
          
          {(mediaType === 'video' || mediaType === 'audio') && (
            <>
              <button
                onClick={togglePlayPause}
                className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                title="Play/Pause (Espaço)"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
                title="Mute/Unmute"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-blue-500"
                title="Volume"
              />
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={downloadMedia}
            className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-colors"
            title="Fechar (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="w-full h-full flex items-center justify-center p-16">
        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt="Visualização"
            className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
            onClick={() => {
              if (zoom === 1) {
                setZoom(2)
              } else {
                setZoom(1)
              }
            }}
          />
        )}

        {mediaType === 'video' && (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="max-w-full max-h-full"
            controls
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onVolumeChange={() => {
              if (videoRef.current) {
                setVolume(videoRef.current.volume)
                setIsMuted(videoRef.current.muted)
              }
            }}
          />
        )}

        {mediaType === 'audio' && (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="mb-4">
              <Volume2 size={64} className="text-gray-400 mx-auto" />
            </div>
            <audio
              ref={audioRef}
              src={mediaUrl}
              controls
              className="w-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={() => {
                if (audioRef.current) {
                  setVolume(audioRef.current.volume)
                  setIsMuted(audioRef.current.muted)
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="bg-black bg-opacity-70 text-white rounded-lg px-4 py-2 max-w-3xl mx-auto">
            {caption}
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black bg-opacity-50 rounded-lg px-3 py-2">
        {mediaType === 'image' && 'Clique para zoom • +/- para zoom • R para rotacionar • Esc para fechar'}
        {mediaType === 'video' && 'Espaço para play/pause • Esc para fechar'}
        {mediaType === 'audio' && 'Esc para fechar'}
      </div>
    </div>
  )
}
