import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../App';

describe('App Component Full-Stack Integration', () => {
  it('renders the 4-step Zero-Friction Hardware Diagnostics interface with initial RF diagnosis', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Zero-Friction Hardware Diagnostics');
    expect(html).toContain('Step 1 · Hardware Ingestion Source');
    expect(html).toContain('Step 2 · Live WebHID Telemetry Stream');
    expect(html).toContain('Step 3 · On-Device Chrome AI Diagnosis');
    expect(html).toContain('Step 4 · One-Click Automated Hardware Resolution');
    expect(html).toContain('USB 3.0 / 2.4GHz RF Spectrum Interference Detected');
    expect(html).toContain('Zero-Leak: 0 B Egress');
    expect(html).toContain('CX Support Bot Test Harness');
    expect(html).toContain('In-Chat 1-Click Fix');
  });
});
