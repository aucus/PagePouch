# PagePouch - Chrome Extension

PagePouch is a sophisticated Chrome browser extension that allows users to save web pages with a single click and manage them with advanced features including AI-powered summaries, visual thumbnails, and intelligent organization.

## 🌟 Features

### Core Functionality
- **One-click saving**: Save any webpage instantly with the extension icon
- **Visual management**: Browse saved pages with thumbnails and metadata
- **Smart search & filtering**: Find pages by title, content, URL, domain, or tags
- **AI-powered summaries**: Generate automatic summaries using OpenAI API
- **Multi-language support**: Korean and English interface with full localization
- **Responsive design**: Works seamlessly across different screen sizes

### Advanced Features
- **Screenshot capture**: Automatic thumbnail generation for saved pages
- **Content extraction**: Intelligent extraction of page metadata and content
- **Tag management**: Organize pages with custom tags
- **Archive functionality**: Archive pages for long-term storage
- **Export/Import**: Backup and restore your saved pages
- **Keyboard shortcuts**: Quick access to common actions

## 📁 Project Structure

```
PagePouch/
├── manifest.json                    # Extension manifest (Manifest V3)
├── background.js                    # Background service worker
├── popup/                          # Extension popup interface
│   ├── popup.html                  # Main popup UI with enhanced features
│   ├── popup.css                   # Modern responsive styles
│   └── popup.js                    # Popup functionality and interactions
├── options/                        # Comprehensive settings page
│   ├── options.html                # Multi-tab options interface
│   ├── options.css                 # Options page styling
│   └── options.js                  # Settings management
├── content/                        # Content scripts
│   └── content.js                  # Page content extraction and injection
├── utils/                          # Core utility modules
│   ├── models.js                   # Data models and validation
│   ├── storage.js                  # Chrome storage operations
│   ├── ai-summary.js               # AI summary generation
│   ├── content-extractor.js        # Page content extraction
│   ├── screenshot.js               # Screenshot capture utilities
│   ├── settings.js                 # Settings management
│   ├── error-handler.js            # Error handling and user feedback
│   ├── i18n.js                     # Internationalization
│   ├── localize.js                 # Localization utilities
│   ├── date-formatter.js           # Date formatting and display
│   ├── helpers.js                  # General utility functions
│   ├── modal.js                    # Modal dialog system
│   ├── toast.js                    # Toast notification system
│   ├── loading.js                  # Loading state management
│   ├── loading-helpers.js          # Loading utility functions
│   └── integration-helpers.js      # Integration and workflow helpers
├── _locales/                       # Internationalization files
│   ├── en/
│   │   └── messages.json           # English translations
│   └── ko/
│       └── messages.json           # Korean translations
├── assets/                         # Extension assets
│   ├── icon16.png                  # 16x16 icon
│   ├── icon16.svg                  # 16x16 SVG icon
│   ├── icon32.svg                  # 32x32 SVG icon
│   ├── icon48.svg                  # 48x48 SVG icon
│   ├── icon128.svg                 # 128x128 SVG icon
│   └── default-thumbnail.svg       # Default thumbnail
├── tests/                          # Comprehensive test suite
│   ├── integration/                # Integration tests
│   ├── *.test.js                   # Unit tests for all modules
│   └── setup.js                    # Test configuration
├── scripts/                        # Build and utility scripts
│   └── generate-icons.js           # Icon generation script
├── package.json                    # Project configuration and dependencies
├── jest.config.js                  # Jest testing configuration
└── README.md                       # This file
```

## 🚀 Installation

### Development Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the project directory
6. The PagePouch extension should now appear in your extensions

### Production Installation

The extension will be available on the Chrome Web Store once published.

## 💻 Usage

### Saving Pages

1. Navigate to any webpage you want to save
2. Click the PagePouch extension icon in the toolbar
3. The page will be saved with thumbnail, metadata, and optional AI summary
4. Use the "Save Current Page" button in the popup for additional options

### Managing Saved Pages

1. Click the PagePouch extension icon to open the popup
2. Browse your saved pages in the visual grid layout
3. Use search and filters to find specific pages
4. Click any page to open it in a new tab
5. Use the delete button (🗑️) to remove pages
6. Tag and organize pages for better management

### Advanced Features

- **AI Summaries**: Enable in settings to get automatic page summaries
- **Screenshots**: Automatic thumbnail generation for visual browsing
- **Tags**: Organize pages with custom tags
- **Archive**: Archive pages for long-term storage
- **Export/Import**: Backup your data or transfer between devices

## ⚙️ Configuration

### Settings Page

Access comprehensive settings through the options page:

1. **General**: Basic preferences and default actions
2. **AI & Summaries**: OpenAI API configuration and summary settings
3. **Storage**: Data management and storage preferences
4. **Privacy**: Privacy and security settings
5. **Advanced**: Developer options and advanced features

### AI Summary Setup (Optional)

PagePouch works perfectly without AI summaries, but you can enable them for enhanced functionality:

1. Open the extension options page
2. Navigate to the "AI & Summaries" tab
3. Check "Enable AI summaries"
4. Enter your OpenAI API key
5. Click "Test API Connection" to verify
6. Save settings

**Note**: AI summaries require an OpenAI API key and will incur API usage costs.

## 🔧 Development

### Prerequisites

- Chrome browser (version 88+)
- Node.js 16+ and npm
- Basic knowledge of HTML, CSS, and JavaScript
- OpenAI API key (optional, for AI features)

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Build and test everything
npm run build

# Development mode with watch
npm run dev
```

### Testing

The project includes comprehensive testing with high coverage requirements:

- **Test Coverage**: 80%+ coverage requirement for branches, functions, lines, and statements
- **Test Framework**: Jest with jsdom environment for DOM testing
- **Mocking**: Chrome APIs, DOM APIs, and external dependencies are fully mocked
- **Integration Tests**: Complete workflow testing in `tests/integration/`
- **Test Reports**: JUnit XML reports for CI/CD integration

Key test categories:
- **Unit Tests**: All utility functions and classes
- **Integration Tests**: Complete user workflows
- **API Tests**: Chrome extension API interactions
- **UI Tests**: Popup and options page functionality
- **Error Handling**: Comprehensive error scenario testing

### Code Quality

- **ESLint**: Standard JavaScript style guide with Chrome extension rules
- **Jest**: Testing framework with comprehensive mocking
- **Coverage Reports**: HTML and LCOV reports generated
- **CI/CD Ready**: Test configuration suitable for continuous integration
- **Type Safety**: Comprehensive data validation and error handling

### Architecture

The extension follows a modular architecture with clear separation of concerns:

- **Models**: Data structures and validation (`utils/models.js`)
- **Storage**: Chrome storage abstraction (`utils/storage.js`)
- **UI Components**: Reusable UI elements (`utils/modal.js`, `utils/toast.js`)
- **Services**: Business logic (`utils/ai-summary.js`, `utils/content-extractor.js`)
- **Utilities**: Helper functions and common operations
- **Internationalization**: Multi-language support system

## 🌍 Internationalization

PagePouch supports multiple languages with a complete i18n system:

- **English**: Default language with full feature support
- **Korean**: Complete Korean translation with cultural adaptations
- **Extensible**: Easy to add new languages

Translation files are located in `_locales/` with comprehensive message coverage.

## 🔒 Privacy & Security

- **Local Storage**: All data stored locally in your browser
- **No Tracking**: No analytics or tracking code
- **API Security**: API keys stored securely in Chrome's storage
- **Content Privacy**: Page content only processed locally or for AI summaries
- **Offline Capable**: Works fully offline (except for AI features)

## 📊 Performance

- **Efficient Storage**: Optimized data structures and storage patterns
- **Lazy Loading**: Content loaded on-demand for better performance
- **Caching**: Intelligent caching of frequently accessed data
- **Memory Management**: Proper cleanup and memory optimization
- **Background Processing**: Non-blocking operations for smooth UX

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure internationalization support for new UI elements
- Test across different Chrome versions

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues, questions, or feature requests:

1. Check the existing issues in the repository
2. Create a new issue with detailed information
3. Include browser version, extension version, and steps to reproduce
4. For bugs, include console logs and error messages

## 📈 Roadmap

### Planned Features
- **Cloud Sync**: Synchronize data across devices
- **Advanced Search**: Full-text search with filters
- **Collections**: Group pages into themed collections
- **Reading Progress**: Track reading progress and bookmarks
- **Social Features**: Share collections with others
- **Mobile App**: Companion mobile application

### Technical Improvements
- **Performance Optimization**: Further performance improvements
- **Accessibility**: Enhanced accessibility features
- **PWA Support**: Progressive Web App capabilities
- **Advanced AI**: More sophisticated AI features

## 📋 Changelog

### Version 1.0.0 (Current)
- **Core Features**: One-click page saving with visual management
- **AI Integration**: OpenAI-powered automatic summaries
- **Multi-language**: Korean and English support
- **Advanced UI**: Modern, responsive interface with filters and search
- **Comprehensive Testing**: 80%+ test coverage with integration tests
- **Developer Tools**: Full development environment with linting and testing
- **Performance**: Optimized storage and memory management
- **Security**: Local storage with optional AI API integration

---

**PagePouch** - Transform your web browsing into an organized, intelligent reading experience.