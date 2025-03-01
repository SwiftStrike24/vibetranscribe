"use client"

import { useEffect, useRef } from "react"

interface AudioVisualizerProps {
  isRecording: boolean
}

// Define WebKit AudioContext type
interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext
}

export default function AudioVisualizer({ isRecording }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    let audioContext: AudioContext | null = null
    let mediaStream: MediaStream | null = null
    let source: MediaStreamAudioSourceNode | null = null

    const setupAudioContext = async () => {
      try {
        if (!isRecording) return

        // Create audio context with proper typing
        const AudioContextClass = window.AudioContext || 
          (window as unknown as WebkitWindow).webkitAudioContext
        audioContext = new AudioContextClass()
        
        // Get user media
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        // Create source from media stream
        source = audioContext.createMediaStreamSource(mediaStream)
        
        // Create analyser
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyserRef.current = analyser
        
        // Connect source to analyser
        source.connect(analyser)
        
        // Create data array for frequency data
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        dataArrayRef.current = dataArray
        
        // Start animation
        startAnimation()
      } catch (error) {
        console.error("Error setting up audio context:", error)
      }
    }

    const startAnimation = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      
      const analyser = analyserRef.current
      const dataArray = dataArrayRef.current
      
      // Set canvas dimensions
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      
      const draw = () => {
        if (!isRecording) return
        
        // Request next animation frame
        animationRef.current = requestAnimationFrame(draw)
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray)
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Set bar width based on canvas width and number of bars
        const barCount = 64 // Number of bars to display
        const barWidth = canvas.width / barCount
        const barSpacing = 2 // Space between bars
        const barWidthWithSpacing = barWidth - barSpacing
        
        // Calculate center of canvas for symmetrical visualization
        const centerY = canvas.height / 2
        
        // Draw bars
        for (let i = 0; i < barCount; i++) {
          // Use a subset of the frequency data
          const dataIndex = Math.floor(i * (dataArray.length / barCount))
          const value = dataArray[dataIndex]
          
          // Calculate bar height based on frequency value (0-255)
          const barHeight = (value / 255) * (canvas.height / 2) * 0.8
          
          // Calculate x position
          const x = i * barWidth
          
          // Create gradient for bars
          const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight)
          gradient.addColorStop(0, 'rgba(167, 139, 250, 1)') // violet-400
          gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.8)') // violet-500
          gradient.addColorStop(1, 'rgba(167, 139, 250, 1)') // violet-400
          
          ctx.fillStyle = gradient
          
          // Draw bar (mirrored around center)
          ctx.beginPath()
          
          // Top bar (rounded top)
          ctx.moveTo(x, centerY - barHeight)
          ctx.lineTo(x, centerY - 2)
          ctx.lineTo(x + barWidthWithSpacing, centerY - 2)
          ctx.lineTo(x + barWidthWithSpacing, centerY - barHeight)
          
          // Add rounded top
          ctx.arc(
            x + barWidthWithSpacing / 2, 
            centerY - barHeight, 
            barWidthWithSpacing / 2, 
            0, 
            Math.PI, 
            true
          )
          
          ctx.fill()
          
          // Bottom bar (rounded bottom)
          ctx.beginPath()
          ctx.moveTo(x, centerY + 2)
          ctx.lineTo(x, centerY + barHeight)
          ctx.lineTo(x + barWidthWithSpacing, centerY + barHeight)
          ctx.lineTo(x + barWidthWithSpacing, centerY + 2)
          
          // Add rounded bottom
          ctx.arc(
            x + barWidthWithSpacing / 2, 
            centerY + barHeight, 
            barWidthWithSpacing / 2, 
            0, 
            Math.PI, 
            false
          )
          
          ctx.fill()
        }
        
        // Draw center line
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)'
        ctx.lineWidth = 2
        ctx.moveTo(0, centerY)
        ctx.lineTo(canvas.width, centerY)
        ctx.stroke()
      }
      
      // Start animation loop
      draw()
    }

    const cleanup = () => {
      // Cancel animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      
      // Stop media stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      
      // Close audio context
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
    }

    if (isRecording) {
      setupAudioContext()
    } else {
      cleanup()
    }

    // Cleanup on unmount
    return cleanup
  }, [isRecording])

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center items-center p-4 pointer-events-none">
      {isRecording && (
        <div className={`
          w-full max-w-md h-24 
          bg-neutral-800/80 backdrop-blur-md 
          rounded-t-xl overflow-hidden 
          shadow-lg border border-violet-500/20
          transition-all duration-500 ease-in-out
          opacity-100 translate-y-0
        `}>
          <canvas ref={canvasRef} className="w-full h-full" />
          
          {/* Add subtle gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-900/20 to-transparent pointer-events-none"></div>
        </div>
      )}
    </div>
  )
}

