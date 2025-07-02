# AGENT Instructions

이 문서는 IOLift(CodePush 클라이언트)를 수정할 때 참고할 지침을 정리한 파일입니다.

## 프로젝트 개요
- React Native에서 사용할 CodePush 클라이언트 라이브러리입니다.
- npm 또는 yarn으로 설치하여 사용합니다.
- TypeScript로 작성되며, iOS/Android 네이티브 코드도 포함되어 있습니다.

## 코드 구조
- `src/`에 주요 TypeScript 코드가 있습니다.
- `android/`, `ios/`에는 네이티브 구현이 있습니다.
- 빌드 결과는 `bin/`과 `dist/`에 생성됩니다.

## 개발 규칙
1. 의존성 설치 후 작업합니다: `npm install` 또는 `yarn install`.
2. 코드 수정 후 린트 검사: `npm run eslint` (또는 `npm run tslint`).
3. 단위 테스트 실행: `npm run jest`.
4. 필요한 경우 플랫폼 테스트를 위해 `npm run test`를 실행할 수 있습니다.
5. 컴파일 단계: `npm run build`로 TypeScript를 빌드합니다.

## 커밋 전 체크리스트
- `npm run eslint`와 `npm run jest` 결과가 모두 통과해야 합니다.
- `npm run build`가 에러 없이 완료되어야 합니다.
- 테스트가 실패하면 수정 후 다시 실행합니다.

## PR 작성 시
- 변경 목적과 주요 내용을 간단히 요약합니다.
- React Native에서 Android와 iOS 모두 동작하는지 확인합니다.
