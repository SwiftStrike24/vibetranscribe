# VibeTranscribe

A Windows desktop application that converts your voice to text with a simple keyboard shortcut and automatically copies it to your clipboard. Built with Electron and Next.js.

![VibeTranscribe](https://img.shields.io/badge/VibeTranscribe-Voice%20to%20Text-8A2BE2)
![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-28.1.0-47848F)
![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20API-green)

## Features

- **Desktop Integration**: Runs as a standalone desktop app with Electron
- **Elegant Minimal UI**: Clean and unobtrusive interface that stays out of your way
- **Keyboard Shortcut Control**: Press `Ctrl + Shift + R` to start recording, `Esc` to stop
- **Microphone Selection**: Choose your preferred audio input device from a dropdown menu
- **Real-time Audio Visualization**: Dynamic audio visualizer displays your voice input
- **Intelligent Error Handling**: Clear notifications for microphone issues or silence detection
- **AI-Powered Transcription**: Uses OpenAI's Whisper API for accurate speech-to-text
- **Automatic Clipboard Copy**: Transcribed text is automatically copied to your clipboard
- **Smooth Animations**: Polished transitions and state changes for excellent UX
- **Always Accessible**: Window stays on top but doesn't interfere with your workflow

## Demo

The application appears as a sleek status indicator at the bottom of your screen. When recording, an elegant audio visualizer appears above the controls. After transcription, the text is displayed with a typing animation and automatically copied to your clipboard.

## Prerequisites

- Node.js 18.x or higher
- OpenAI API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibetranscribe.git
   cd vibetranscribe
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

### Development Mode

1. Start the development server:
   ```bash
   npm run dev
   ```

2. The Electron app will launch automatically with the development server.

### Production Build

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production app:
   ```bash
   npm start
   ```

### Keyboard Controls

- Press `Ctrl + Shift + R` to start recording
- Speak into your microphone
- Press `Esc` to stop recording
- The text will be automatically transcribed and copied to your clipboard

### Microphone Selection

- Click on the microphone icon dropdown in the status bar
- Select your preferred input device from the list
- The app will remember your selection for future sessions

## How It Works

VibeTranscribe combines several technologies:

1. **Electron**: Creates a desktop application wrapper
2. **Next.js & React**: Powers the UI and application logic
3. **MediaRecorder API**: Captures audio from your microphone
4. **OpenAI Whisper API**: Transcribes audio to text
5. **Global Keyboard Shortcuts**: Enables system-wide control

The application flow:
1. User selects their preferred microphone
2. User activates recording with keyboard shortcut
3. Sleek UI shows recording status with animated visualizer above the controls
4. Upon stopping, audio is sent to OpenAI's Whisper API
5. Transcribed text appears with a typing animation
6. Text is automatically copied to clipboard for immediate use

## Project Structure

```
VibeTranscribe/
│── components/
│   ├── Recorder.tsx           # Handles audio recording
│   ├── Transcriber.tsx        # Handles transcription
│   ├── Visualizer.tsx         # Wraps the audio visualizer
│   ├── ClientOnly.tsx         # Client-side only wrapper
│   ├── audio-visualizer.tsx   # Audio visualization component
│   ├── StreamingTranscription.tsx # Animated text display
│── electron/
│   ├── main.ts                # Electron main process
│   ├── preload.ts             # Preload script for IPC
│── utils/
│   ├── keyboardShortcuts.ts   # Defines shortcut activation
│   ├── audioDevices.ts        # Handles microphone enumeration
│── app/
│   ├── api/
│   │   ├── transcribe/
│   │   │   ├── route.ts       # API endpoint for transcription
│   ├── page.tsx               # Main UI page
│   ├── globals.css            # Global styles
│   ├── electron.css           # Electron-specific styles
│── types/
│   ├── electron.d.ts          # Electron type definitions
```

## Development Notes

- The application uses Electron for desktop integration
- UI components are designed to be minimal and unobtrusive
- Audio visualization appears above recording controls with proper spacing
- Smooth transitions enhance the user experience
- Error handling provides feedback for common audio issues
- Global keyboard shortcuts work system-wide, even when the app is in the background

## Troubleshooting

- **Microphone Access**: Ensure you've granted microphone permissions
- **No Audio Detected**: If you see this warning, check if your microphone is muted or working properly
- **API Key**: Verify your OpenAI API key is correctly set in the `.env` file
- **Keyboard Shortcuts**: Make sure no other application is using the same keyboard shortcuts
- **Microphone Selection**: If your microphone isn't listed, try reconnecting it or restarting the app

## License

MIT

## Acknowledgements

- [OpenAI Whisper](https://openai.com/blog/whisper/) for the speech recognition model
- [Next.js](https://nextjs.org/) for the React framework
- [Electron](https://www.electronjs.org/) for desktop application capabilities
- [Tailwind CSS](https://tailwindcss.com/) for styling and animations
