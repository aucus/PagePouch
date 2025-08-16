# Implementation Plan
<!-- 구현 계획 - LaterLens 크롬 확장 프로그램 개발을 위한 단계별 작업 목록 -->

- [x] 1. Set up Chrome extension project structure and manifest
  <!-- 작업 1: 크롬 확장 프로그램 프로젝트 구조 및 매니페스트 설정 -->
  - Create directory structure for popup, options, content, utils, and assets
    <!-- popup, options, content, utils, assets 디렉토리 구조 생성 -->
  - Write manifest.json with required permissions and component declarations
    <!-- 필요한 권한 및 컴포넌트 선언이 포함된 manifest.json 작성 -->
  - Create basic HTML templates for popup and options pages
    <!-- 팝업 및 옵션 페이지용 기본 HTML 템플릿 생성 -->
  - _Requirements: 1.1, 2.1, 4.1_

- [ ] 2. Implement core data models and storage utilities
  <!-- 작업 2: 핵심 데이터 모델 및 스토리지 유틸리티 구현 -->
- [x] 2.1 Create SavedPage data model with validation
  <!-- 작업 2.1: 검증 기능이 포함된 SavedPage 데이터 모델 생성 -->
  - Write SavedPage class with constructor, validation, and serialization methods
    <!-- 생성자, 검증, 직렬화 메서드가 포함된 SavedPage 클래스 작성 -->
  - Implement unique ID generation and URL parsing utilities
    <!-- 고유 ID 생성 및 URL 파싱 유틸리티 구현 -->
  - Create unit tests for SavedPage model validation and methods
    <!-- SavedPage 모델 검증 및 메서드용 단위 테스트 생성 -->
  - _Requirements: 1.1, 6.1, 6.5_

- [x] 2.2 Implement storage service abstraction layer
  <!-- 작업 2.2: 스토리지 서비스 추상화 레이어 구현 -->
  - Write StorageService class with CRUD operations for Chrome local storage
    <!-- Chrome 로컬 스토리지용 CRUD 작업이 포함된 StorageService 클래스 작성 -->
  - Implement error handling for storage quota and corruption scenarios
    <!-- 스토리지 할당량 및 손상 시나리오에 대한 오류 처리 구현 -->
  - Create unit tests for all storage operations and error conditions
    <!-- 모든 스토리지 작업 및 오류 조건에 대한 단위 테스트 생성 -->
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2.3 Create extension settings management
  <!-- 작업 2.3: 확장 프로그램 설정 관리 생성 -->
  - Implement ExtensionSettings class with load/save functionality
    <!-- 로드/저장 기능이 포함된 ExtensionSettings 클래스 구현 -->
  - Add validation for API keys and configuration options
    <!-- API 키 및 구성 옵션에 대한 검증 추가 -->
  - Write unit tests for settings persistence and validation
    <!-- 설정 지속성 및 검증에 대한 단위 테스트 작성 -->
  - _Requirements: 4.2, 4.3, 5.1_

- [ ] 3. Build content extraction and page capture functionality
  <!-- 작업 3: 콘텐츠 추출 및 페이지 캡처 기능 구축 -->
- [x] 3.1 Implement content script for page metadata extraction
  <!-- 작업 3.1: 페이지 메타데이터 추출용 콘텐츠 스크립트 구현 -->
  - Write content script to extract Open Graph metadata and page title
    <!-- Open Graph 메타데이터 및 페이지 제목 추출용 콘텐츠 스크립트 작성 -->
  - Implement fallback mechanisms for missing metadata
    <!-- 누락된 메타데이터에 대한 대체 메커니즘 구현 -->
  - Create unit tests with mock DOM structures for metadata extraction
    <!-- 메타데이터 추출용 모의 DOM 구조를 사용한 단위 테스트 생성 -->
  - _Requirements: 1.2, 1.3_

- [x] 3.2 Add screenshot capture functionality
  <!-- 작업 3.2: 스크린샷 캡처 기능 추가 -->
  - Implement screenshot capture using chrome.tabs.captureVisibleTab API
    <!-- chrome.tabs.captureVisibleTab API를 사용한 스크린샷 캡처 구현 -->
  - Add image processing utilities for thumbnail generation and compression
    <!-- 썸네일 생성 및 압축을 위한 이미지 처리 유틸리티 추가 -->
  - Write tests for screenshot capture with different page layouts
    <!-- 다양한 페이지 레이아웃에서의 스크린샷 캡처 테스트 작성 -->
  - _Requirements: 1.3, 2.2_

- [x] 3.3 Create page content extraction for AI summarization
  <!-- 작업 3.3: AI 요약을 위한 페이지 콘텐츠 추출 생성 -->
  - Implement content extraction from page DOM for summary generation
    <!-- 요약 생성을 위한 페이지 DOM에서 콘텐츠 추출 구현 -->
  - Add text cleaning and preprocessing utilities
    <!-- 텍스트 정리 및 전처리 유틸리티 추가 -->
  - Write unit tests for content extraction with various page structures
    <!-- 다양한 페이지 구조에서의 콘텐츠 추출 단위 테스트 작성 -->
  - _Requirements: 1.4_

- [ ] 4. Implement optional AI summary service integration
  <!-- 작업 4: 선택적 AI 요약 서비스 통합 구현 -->
- [x] 4.1 Create optional AI API service wrapper
  <!-- 작업 4.1: 선택적 AI API 서비스 래퍼 생성 -->
  - Write SummaryService class with OpenAI API integration and configuration check
    <!-- 구성 확인 기능이 포함된 OpenAI API 통합 SummaryService 클래스 작성 -->
  - Implement API key validation, error handling, and isConfigured() method
    <!-- API 키 검증, 오류 처리, isConfigured() 메서드 구현 -->
  - Create unit tests with mocked API responses, error scenarios, and unconfigured states
    <!-- 모의 API 응답, 오류 시나리오, 미구성 상태를 사용한 단위 테스트 생성 -->
  - _Requirements: 1.4, 1.5, 4.3, 4.4, 4.7_

- [x] 4.2 Add conditional summary generation workflow
  <!-- 작업 4.2: 조건부 요약 생성 워크플로우 추가 -->
  - Integrate AI service with page saving process only when API is configured
    <!-- API가 구성된 경우에만 AI 서비스를 페이지 저장 프로세스와 통합 -->
  - Implement fallback to "요약 없음" when AI is not configured or fails
    <!-- AI가 구성되지 않았거나 실패할 때 "요약 없음"으로 대체 처리 구현 -->
  - Write integration tests for both AI-enabled and AI-disabled workflows
    <!-- AI 활성화 및 비활성화 워크플로우 모두에 대한 통합 테스트 작성 -->
  - _Requirements: 1.4, 1.5, 4.6, 4.7_

- [ ] 5. Build background service worker
- [x] 5.1 Implement background service worker message handling
  - Create message router for handling popup and content script communications
  - Implement page saving orchestration combining all extraction services
  - Write unit tests for message handling and service coordination
  - _Requirements: 1.1, 1.6, 1.7_

- [x] 5.2 Add extension lifecycle management
  - Implement service worker installation and activation handlers
  - Add error handling and recovery mechanisms for service worker failures
  - Create integration tests for extension lifecycle events
  - _Requirements: 6.2_

- [ ] 6. Create popup interface for saved pages management
- [x] 6.1 Build popup HTML structure and basic styling
  - Create responsive popup layout with grid for saved pages
  - Implement CSS styling with proper spacing and visual hierarchy
  - Add loading states and empty state messaging
  - _Requirements: 2.1, 2.5, 5.6_

- [x] 6.2 Implement saved pages display functionality
  - Write JavaScript to load and render saved pages from storage
  - Add thumbnail loading with fallback to default images
  - Implement click handlers for opening saved pages in new tabs
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6.3 Add search functionality to popup
  - Implement search input with real-time filtering
  - Add search highlighting for matching text in results
  - Write unit tests for search filtering and highlighting logic
  - _Requirements: 3.1, 3.2_

- [x] 6.4 Implement delete functionality
  - Add delete buttons to saved page items with confirmation dialogs
  - Implement bulk delete functionality with "delete all" option
  - Write unit tests for delete operations and UI updates
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 7. Build options page for extension configuration
- [x] 7.1 Create options page HTML and styling
  - Build options page layout with form inputs for API configuration
  - Add proper form validation and user feedback elements
  - Implement responsive design for different screen sizes
  - _Requirements: 4.1, 5.6_

- [x] 7.2 Implement optional API key configuration functionality
  <!-- 작업 7.2: 선택적 API 키 구성 기능 구현 -->
  - Write JavaScript for optional API key input, validation, and storage
    <!-- 선택적 API 키 입력, 검증, 저장을 위한 JavaScript 작성 -->
  - Add test API call functionality to verify key validity when provided
    <!-- 제공된 경우 키 유효성을 확인하는 테스트 API 호출 기능 추가 -->
  - Implement clear messaging that AI features are optional
    <!-- AI 기능이 선택사항임을 명확히 하는 메시지 구현 -->
  - Add functionality to disable/clear API key settings
    <!-- API 키 설정을 비활성화/삭제하는 기능 추가 -->
  - _Requirements: 4.2, 4.3, 4.4, 4.6, 4.7_

- [ ] 8. Add internationalization support
- [x] 8.1 Implement language detection and text localization
  - Create language resource files for Korean and English
  - Implement language detection from browser settings
  - Add text replacement functionality for all UI elements
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 8.2 Add localized date formatting
  - Implement date formatting utilities for different locales
  - Update all timestamp displays to use localized formatting
  - Write unit tests for date formatting in different languages
  - _Requirements: 5.5_

- [ ] 9. Implement error handling and user feedback
- [x] 9.1 Create error handling utilities and user messaging
  - Write ErrorHandler class with categorized error processing
  - Implement user-friendly error messages for different failure scenarios
  - Add toast notifications or modal dialogs for error display
  - _Requirements: 1.5, 4.4, 6.3, 6.4_

- [x] 9.2 Add loading states and progress indicators
  - Implement loading spinners for save operations and API calls
  - Add progress feedback for long-running operations
  - Write CSS animations and JavaScript for loading state management
  - _Requirements: 1.7, 2.5_

- [ ] 10. Create comprehensive test suite
- [x] 10.1 Write unit tests for all utility functions and classes
  <!-- 작업 10.1: 모든 유틸리티 함수 및 클래스에 대한 단위 테스트 작성 -->
  - Create test files for storage, optional AI service, content extraction, and data models
    <!-- 스토리지, 선택적 AI 서비스, 콘텐츠 추출, 데이터 모델에 대한 테스트 파일 생성 -->
  - Implement mock objects for Chrome APIs and external services
    <!-- Chrome API 및 외부 서비스용 모의 객체 구현 -->
  - Add test coverage for both AI-enabled and AI-disabled scenarios
    <!-- AI 활성화 및 비활성화 시나리오 모두에 대한 테스트 커버리지 추가 -->
  - Add test coverage reporting and validation
    <!-- 테스트 커버리지 보고 및 검증 추가 -->
  - _Requirements: All requirements validation_

- [x] 10.2 Implement integration tests for user workflows
  - Write end-to-end tests for page saving, viewing, and deletion workflows
  - Create tests for extension installation and configuration processes
  - Add performance tests for operations timing requirements
  - _Requirements: 1.7, 2.5_

- [ ] 11. Final integration and polish
  <!-- 작업 11: 최종 통합 및 마무리 -->
- [x] 11.1 Integrate all components and test complete workflows
  <!-- 작업 11.1: 모든 컴포넌트 통합 및 완전한 워크플로우 테스트 -->
  - Connect background service worker with popup and options pages
    <!-- 백그라운드 서비스 워커를 팝업 및 옵션 페이지와 연결 -->
  - Test complete user journeys from installation to daily usage
    <!-- 설치부터 일상 사용까지 완전한 사용자 여정 테스트 -->
  - Fix any integration issues and optimize performance
    <!-- 통합 문제 수정 및 성능 최적화 -->
  - _Requirements: All requirements_

- [x] 11.2 Add extension icons and final UI polish
  <!-- 작업 11.2: 확장 프로그램 아이콘 추가 및 최종 UI 마무리 -->
  - Create and integrate extension icons in required sizes (16px, 48px, 128px)
    <!-- 필요한 크기(16px, 48px, 128px)의 확장 프로그램 아이콘 생성 및 통합 -->
  - Apply final styling touches and ensure consistent visual design
    <!-- 최종 스타일링 적용 및 일관된 시각적 디자인 보장 -->
  - Test extension packaging and installation process
    <!-- 확장 프로그램 패키징 및 설치 프로세스 테스트 -->
  - _Requirements: 2.1, 5.6_