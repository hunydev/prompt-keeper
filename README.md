# Prompt Keeper

[![Netlify Status](https://api.netlify.com/api/v1/badges/a786121b-ec6e-4454-84f5-66eea3eeb4f2/deploy-status)](https://app.netlify.com/projects/hunydev-prompt-keeper/deploys)

## 소개

**Prompt Keeper**는 자주 사용하는 AI 프롬프트를 저장하고, 쉽게 관리 및 재사용할 수 있도록 도와주는 북마크형 웹앱입니다. 반복적으로 사용하는 프롬프트를 한 곳에 모아두고, 필요할 때 빠르게 불러와 사용할 수 있습니다.

이 프로젝트는 현재 <a href="https://prompts.huny.dev" target="_blank">https://prompts.huny.dev</a> 에서 서비스되고 있습니다.

이 프로젝트는 Netlify 환경에 최적화되어 있으며, Netlify Functions와 Netlify Blobs를 활용하여 서버리스 방식으로 데이터를 저장하고 관리합니다. Netlify에서 구동되어야만 정상적으로 동작합니다.

## 주요 특징
- 자주 쓰는 AI 프롬프트를 손쉽게 저장 및 관리
- 카테고리별 프롬프트 분류 및 검색 기능
- Netlify Functions 기반 서버리스 백엔드
- Netlify Blobs를 이용한 데이터 저장
- GitHub 및 Netlify를 통한 배포 및 관리

## 사용 방법
1. 이 저장소를 Fork 또는 Clone합니다.
2. Netlify에 연결하여 배포합니다.
3. 환경 변수 및 Netlify Functions, Blobs 설정을 마치면 바로 사용 가능합니다.

## Netlify 배포
이 프로젝트는 Netlify에 최적화되어 있습니다. Netlify Functions(`netlify/functions`)와 Blobs를 사용하므로, 반드시 Netlify에서 배포 및 구동해야 합니다.

- Netlify Functions: 서버리스 API 및 데이터 처리 담당
- Netlify Blobs: 프롬프트 데이터 영구 저장

## 기여 방법
Pull Request 및 Issue 등록을 환영합니다. 개선 사항이나 버그 제보, 기능 제안이 있다면 언제든 참여해주세요.

## 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 LICENSE 파일을 참고하세요.
