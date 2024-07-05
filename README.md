# Online TOTP Generator

A web application for generating Time-based One-Time Passwords (TOTP) for two-factor authentication (2FA).

## Description

This application provides a clean, minimalist interface for generating and managing TOTP codes for multiple accounts. It's designed to be privacy-focused, with all operations performed client-side and data stored locally in the browser.

## Features

- Generate and display TOTP codes with countdown timer
- Support for multiple accounts
- Client-side only functionality
- Privacy-focused: no tracking, analytics, or account requirements
- RFC 6238 compatible
- Local browser storage with data export (backup) and import (restore) options
- Auto-updating TOTP without page refresh
- Dark/light modes and responsive design (optimized for desktop)
- TOTP secret generator
- Adheres to WCAG 2.1 Level AA accessibility standards

## Technology Stack

- Preact
- jsSHA library for SHA-1 hashing
- GitHub Pages for hosting

## Project Structure

- `app.js`: Main application logic and components
- `totp.js`: TOTP-related functions and logic

## Security Measures

- Implements Content Security Policy (CSP)
- Input validation for Base32 secret keys
- Sanitization to prevent XSS attacks
- Rate limiting for TOTP generation
- All resources served from the same origin

## Performance Optimizations

- Optimized for low-performance virtualized desktops
- Initial load <5s on corporate networks, <1MB size, <20% CPU and <100MB memory usage
- Responsive alongside resource-intensive applications (e.g., Skype for Business)

## Browser Support

Supports IE11, Edge (14+), Chrome (49+), Firefox (52+) with graceful degradation.

## Data Persistence

Uses browser's localStorage to save and retrieve account data. Data export and import functionality implemented without encryption.

## Styling

- Uses CSS variables for theming
- Implements responsive design for various screen sizes
- Light/dark mode toggle in footer

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.