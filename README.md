<p align="center">
  <img src="https://github.com/FCG-labs/IOLift/blob/main/favicon.png" alt="IOLift Logo" width="200"/>
</p>

<h1 align="center">IOLift</h1>


# IOLift & CodePush / OTA / React Native CodePush / Flutter Shorebird

## 📚 개요

이 저장소는 **IOLift**와 함께 사용하는 **모바일 OTA(Over The Air)** 업데이트 기술들인  
**CodePush, Flutter Shorebird**를 이해하고 통합하기 위한 가이드입니다.

- **IOLift**: OTA 업데이트를 위한 백엔드 통합 프레임워크.
- **CodePush**: React Native 전용 코드 핫 업데이트(Hot Update) 솔루션.
- **Flutter Shorebird**: Flutter 앱을 위한 OTA 패치 서비스.
- **OTA(Over The Air)**: 앱스토어를 거치지 않고 앱 업데이트를 배포하는 기술.

---

## 🚀 주요 기술 설명

| 기술 | 설명 |
|:---|:---|
| **IOLift** | OTA 서버 백엔드 및 패치 관리 플랫폼. 다양한 앱 프론트엔드와 연동 가능. |
| **CodePush** | Microsoft가 만든 React Native 핫 업데이트 서비스. JS 번들(코드)만 업데이트. |
| **OTA** | 앱스토어 업데이트 없이, 네트워크를 통해 앱 코드/자산을 실시간 패치하는 기술 전반. |
| **React Native CodePush** | CodePush SDK를 이용해 RN 앱에서 OTA 업데이트를 적용하는 방법론. |
| **Flutter Shorebird** | Flutter 앱의 바이너리를 부분적으로 패치하는 OTA 플랫폼. Flutter 특화. |

---

## 🏗️ 아키텍처 다이어그램

```
                   +------------------+
                   |    IOLift Server  |
                   |  (Patch Hosting)  |
                   +------------------+
                            |
           +----------------+----------------+
           |                                 |
    +--------------+               +----------------+
    | React Native |               |    Flutter      |
    |    앱        |               |     앱          |
    +--------------+               +----------------+
           |                                 |
    [CodePush SDK]                     [Shorebird SDK]
           |                                 |
    다운로드 및 패치 적용           다운로드 및 패치 적용
```

## 📄 참고 자료
- [Microsoft AppCenter CodePush](https://microsoft.github.io/code-push/)
- [Shorebird Official](https://shorebird.dev/)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## ⚠️ 주의사항 및 고지 (Disclaimer)

- 본 저장소는 **CodePush** 및 **Shorebird**를 기반으로 개발되었으나,  
  향후 업데이트 시 자체 SDK 또는 백엔드 시스템으로 변경될 수 있습니다.
- 변경이 발생할 경우, 주요 인터페이스(API)와 동작 방식이 달라질 수 있습니다.
- 본 저장소의 코드를 사용하여 발생하는 모든 문제(배포 실패, 앱 오류, 데이터 손실 등)는  
  **사용자 본인의 책임**입니다.
- 이 저장소는 "있는 그대로(AS IS)" 제공되며,  
  사용으로 인한 직접적/간접적 손해에 대해 어떠한 책임도 지지 않습니다.
