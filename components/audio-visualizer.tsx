"use client"

import { useEffect, useRef, useState } from "react"

interface AudioVisualizerProps {
  isRecording?: boolean
}

export function AudioVisualizerComponent({ isRecording = false }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const analyserRef = useRef<AnalyserNode | undefined>(undefined)
  const dataArrayRef = useRef<Uint8Array | undefined>(undefined)
  const [isMounted, setIsMounted] = useState(false)

  // Set isMounted to true once component mounts
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isRecording || !isMounted) return

    let cleanupFunction = () => {}

    const setupAudio = async () => {
      try {
        // Check if we're in the browser and have access to the required APIs
        if (typeof window === 'undefined' || !window.AudioContext || !navigator.mediaDevices) {
          console.error("Audio APIs not available")
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()

        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        const bufferLength = analyser.frequencyBinCount
        dataArrayRef.current = new Uint8Array(bufferLength)

        animate()

        // Define cleanup for this effect
        cleanupFunction = () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current)
          }
          // Close audio context and stop tracks
          if (audioContext.state !== 'closed') {
            audioContext.close()
          }
          stream.getTracks().forEach(track => track.stop())
        }
      } catch (error) {
        console.error("Error accessing microphone:", error)
      }
    }

    setupAudio()

    // Return cleanup function
    return () => cleanupFunction()
  }, [isRecording, isMounted])

  const animate = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    if (!canvas || !analyser || !dataArray) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      const WIDTH = canvas.width
      const HEIGHT = canvas.height

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = "rgb(17, 17, 17)" // Dark background
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      const barWidth = (WIDTH / dataArray.length) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, HEIGHT - barHeight, 0, HEIGHT)
        gradient.addColorStop(0, "rgba(167, 139, 250, 0.8)") // Lighter purple
        gradient.addColorStop(1, "rgba(139, 92, 246, 0.5)") // Darker purple

        ctx.fillStyle = gradient
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()
  }

  // Only render the canvas on the client side
  if (!isMounted) {
    return (
      <div className="relative w-full h-48 bg-neutral-900 rounded-xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
          <p className="text-sm font-medium">Loading visualizer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-48 bg-neutral-900 rounded-xl overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />
      <canvas ref={canvasRef} width={800} height={192} className="w-full h-full" />
      {!isRecording && (
        <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
          <p className="text-sm font-medium">Waiting for audio input...</p>
        </div>
      )}
    </div>
  )
}

