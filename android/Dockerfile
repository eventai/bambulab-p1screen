FROM ghcr.io/cirruslabs/android-sdk:35 AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates gnupg unzip \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && curl -fsSL https://services.gradle.org/distributions/gradle-8.7-bin.zip -o /tmp/gradle.zip \
  && mkdir -p /opt/gradle \
  && unzip -q /tmp/gradle.zip -d /opt/gradle \
  && ln -sf /opt/gradle/gradle-8.7/bin/gradle /usr/local/bin/gradle \
  && npm install -g npm@10 \
  && rm -f /tmp/gradle.zip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

ARG APK_TASK=:app:assembleRelease
ARG APK_GLOB=*release*.apk
ARG APK_OUT=app-release.apk

COPY package*.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN npm ci

COPY . .
RUN npm run build:web

RUN gradle -p android ${APK_TASK} --no-daemon

RUN mkdir -p /workspace/dist/apk \
  && cp "$(find /workspace/android/app/build/outputs/apk -maxdepth 3 -name "${APK_GLOB}" | head -n 1)" "/workspace/dist/apk/${APK_OUT}"

FROM scratch AS artifact
COPY --from=builder /workspace/dist/apk/ /
