# Candidate Ranker UI

This project provides a small in-browser tool for ranking candidates from a CSV export. The interface is now built with **React** and runs entirely on the client without any server component.

## Development

The app is intentionally lightweight and does not use a bundler. React and Babel are loaded from CDNs at runtime. To work on the project, simply open `index.html` in a browser.

## Testing

Core scoring logic is separated in `main.js` and can be tested with Node:

```bash
npm test
```

