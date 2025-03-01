"use client"

import { useEffect, useRef, useState } from "react"

interface AudioVisualizerProps {
  isRecording: boolean
  selectedMicDevice?: string
}

// Define WebKit AudioContext type
interface WebkitWindow extends Window {
  webkitAudioContext: typeof AudioContext
}

export default function AudioVisualizer({ isRecording, selectedMicDevice }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [noAudioDetected, setNoAudioDetected] = useState(false)
  const noAudioTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceDetectionCountRef = useRef(0)

  useEffect(() => {
    let audioContext: AudioContext | null = null
    let mediaStream: MediaStream | null = null
    let source: MediaStreamAudioSourceNode | null = null
    let silenceDetector: NodeJS.Timeout | null = null

    const setupAudioContext = async () => {
      try {
        if (!isRecording) return

        // Reset error states when starting
        setAudioError(null)
        setNoAudioDetected(false)
        silenceDetectionCountRef.current = 0
        
        if (noAudioTimeoutRef.current) {
          clearTimeout(noAudioTimeoutRef.current)
          noAudioTimeoutRef.current = null
        }

        // Create audio context with proper typing
        const AudioContextClass = window.AudioContext || 
          (window as unknown as WebkitWindow).webkitAudioContext
        audioContext = new AudioContextClass()
        
        // Configure audio constraints
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
        
        // Add deviceId constraint if a specific microphone is selected
        if (selectedMicDevice) {
          console.log("Visualizer using selected microphone device:", selectedMicDevice)
          audioConstraints.deviceId = { exact: selectedMicDevice }
        }
        
        // Get user media with selected device if specified
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: audioConstraints
        })
        
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
        
        // Setup silence detection
        silenceDetector = setInterval(() => {
          if (!dataArrayRef.current || !analyserRef.current) return
          
          const dataArray = dataArrayRef.current
          analyserRef.current.getByteFrequencyData(dataArray)
          
          // Check if audio is silent (all values below threshold)
          const threshold = 5 // Adjust based on your needs
          const isSilent = Array.from(dataArray).every(value => value < threshold)
          
          if (isSilent) {
            silenceDetectionCountRef.current++
            
            // If silence persists for several checks, show warning
            if (silenceDetectionCountRef.current > 10 && !noAudioDetected) {
              console.warn("No audio detected from microphone")
              setNoAudioDetected(true)
            }
          } else {
            // Reset if sound is detected
            if (noAudioDetected) {
              setNoAudioDetected(false)
            }
            silenceDetectionCountRef.current = 0
          }
        }, 500)
        
      } catch (error) {
        console.error("Error setting up audio context:", error)
        
        // Handle different error types
        if (error instanceof DOMException) {
          if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            setAudioError("Microphone not found. Please check your device connections.")
          } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            setAudioError("Microphone permission denied. Please allow access to your microphone.")
          } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            setAudioError("Could not access microphone. It may be in use by another application.")
          } else {
            setAudioError("Error accessing microphone: " + error.message)
          }
        } else {
          setAudioError("Error setting up audio visualization")
        }
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
      
      // Clear silence detection
      if (silenceDetector) {
        clearInterval(silenceDetector)
      }
      
      if (noAudioTimeoutRef.current) {
        clearTimeout(noAudioTimeoutRef.current)
        noAudioTimeoutRef.current = null
      }
      
      // Stop media stream tracks
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      
      // Close audio context
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close()
      }
      
      // Reset error states
      setAudioError(null)
      setNoAudioDetected(false)
    }

    if (isRecording) {
      setupAudioContext()
    } else {
      cleanup()
    }

    // Cleanup on unmount
    return cleanup
  }, [isRecording, selectedMicDevice, noAudioDetected])

  return (
    <div className="fixed bottom-10 left-0 right-0 flex flex-col justify-center items-center p-4 pointer-events-none">
      {isRecording && (
        <>
          <div className={`
            w-full max-w-md h-24 
            bg-neutral-800/80 backdrop-blur-md 
            rounded-xl overflow-hidden 
            shadow-lg border border-violet-500/20
            transition-all duration-500 ease-in-out
            opacity-100
            relative
            mb-2
            motion-safe:animate-fadeIn
          `}>
            <canvas ref={canvasRef} className="w-full h-full" />
            
            {/* Add subtle gradient overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-neutral-900/20 to-transparent pointer-events-none"></div>
            
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-violet-500/5 blur-xl rounded-full pointer-events-none opacity-50"></div>
            
            {/* Error message */}
            {audioError && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
                <div className="text-center px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/40 max-w-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-300 text-sm">{audioError}</p>
                </div>
              </div>
            )}
            
            {/* No audio detected warning */}
            {noAudioDetected && !audioError && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/70 backdrop-blur-sm">
                <div className="text-center px-4 py-3 rounded-lg bg-amber-500/20 border border-amber-500/40 max-w-xs animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 01.001-7.072m-2.828 9.9a9 9 0 010-12.728" />
                  </svg>
                  <p className="text-amber-300 text-sm">No audio detected. Please check if your microphone is working properly.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Connecting element */}
          <div className="w-0.5 h-4 bg-gradient-to-b from-violet-500/30 to-transparent"></div>
        </>
      )}
    </div>
  )
}

