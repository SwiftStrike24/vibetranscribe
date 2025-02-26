# VibeTranscribe

A Windows-based AI transcription tool that converts your voice to text with a simple keyboard shortcut and automatically copies it to your clipboard.

![VibeTranscribe](https://img.shields.io/badge/VibeTranscribe-Voice%20to%20Text-8A2BE2)
![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![OpenAI](https://img.shields.io/badge/OpenAI-Whisper%20API-green)

## Features

- **Keyboard Shortcut Activation**: Press `Ctrl + Alt + R` to start recording, `Esc` to stop
- **Real-time Audio Visualization**: Dynamic audio visualizer shows your voice input
- **AI-Powered Transcription**: Uses OpenAI's Whisper API for accurate speech-to-text
- **Automatic Clipboard Copy**: Transcribed text is automatically copied to your clipboard
- **Sleek UI**: Minimalist interface with visual feedback

## Demo

The application appears at the bottom middle of your screen when activated, showing a real-time audio visualizer while recording. After stopping the recording, the transcribed text is displayed and automatically copied to your clipboard.

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

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

3. Use the keyboard shortcuts:
   - Press `Ctrl + Alt + R` to start recording
   - Speak into your microphone
   - Press `Esc` to stop recording
   - Wait for the transcription to complete
   - The text will be automatically copied to your clipboard

## How It Works

VibeTranscribe uses several key technologies:

1. **MediaRecorder API**: Captures audio from your microphone
2. **KeyboardJS**: Handles keyboard shortcut detection
3. **OpenAI Whisper API**: Transcribes audio to text
4. **Next.js & React**: Powers the UI and application logic
5. **ShadCN UI**: Provides the custom audio visualizer component

The application flow:
1. User activates recording with keyboard shortcut
2. Audio is captured and visualized in real-time
3. Upon stopping, audio is sent to OpenAI's Whisper API
4. Transcribed text is displayed and copied to clipboard

## Project Structure

```
VibeTranscribe/
│── components/
│   ├── Recorder.tsx       # Handles audio recording
│   ├── Transcriber.tsx    # Handles transcription
│   ├── Visualizer.tsx     # Wraps the audio visualizer
│   ├── ClientOnly.tsx     # Client-side only wrapper
│   ├── audio-visualizer.tsx # ShadCN UI component
│── utils/
│   ├── keyboardShortcuts.ts # Defines shortcut activation
│── app/
│   ├── api/
│   │   ├── transcribe/
│   │   │   ├── route.ts   # API endpoint for transcription
│   ├── page.tsx           # Main UI page
│   ├── globals.css        # Global styles
│── types/
│   ├── keyboardjs.d.ts    # Type definitions
```

## Development Notes

- The application uses client-side only rendering for components that interact with browser APIs to prevent hydration errors
- Audio recording and processing is done entirely in the browser
- Transcription is processed through a server-side API route that communicates with OpenAI

## Troubleshooting

- **Microphone Access**: Ensure your browser has permission to access your microphone
- **API Key**: Verify your OpenAI API key is correctly set in the `.env` file
- **Keyboard Shortcuts**: Make sure no other application is using the same keyboard shortcuts

## License

MIT

## Acknowledgements

- [OpenAI Whisper](https://openai.com/blog/whisper/) for the speech recognition model
- [Next.js](https://nextjs.org/) for the React framework
- [ShadCN UI](https://ui.shadcn.com/) for the audio visualizer component
- [KeyboardJS](https://github.com/RobertWHurst/KeyboardJS) for keyboard shortcut handling
