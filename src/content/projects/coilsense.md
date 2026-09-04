---
title: CoilSense
description: Teaching Steel Industry Equipment to See
stage: piloted
purpose: Using computer vision and AI to help a steel-processing machine understand what is happening around it in real time—where the moving steel is, whether it is moving correctly, and whether intervention is needed.
contributors:
  - Sina Alborzi
category: active
pubDate: 2025-06-01
tags:
  - Computer Vision
  - Industrial AI
  - Edge AI
  - Deep Learning
  - Real-Time Systems
  - Cloud Architecture
repoUrl: ''
liveUrl: ''
heroImage: /media/herocoilbox.webp
cardColor: '#c77fa9'
cardColorAlt: '#8f600f'
---

CoilSense is a real-time computer-vision system developed to give heavy industrial equipment visual awareness of a fast-moving steel process.

The system uses industrial cameras, AI-based feature detection, classical computer vision, geometric measurement, GPU inference, and PLC integration to turn video into actionable process information.

It was designed for a particularly difficult vision environment: glowing steel, high temperatures, steam, dust, flying scale, equipment occlusion, and rapid motion.

***

## From detection to engineering measurements

The goal was not simply to detect objects in an image.

The vision pipeline identifies features such as the coil tail and inner coil geometry, then uses those detections to calculate measurements including:

- tail position and orientation;
- coil motion and process-state verification;
- coil shape and roundness;
- material speed; and
- completion of key mechanical operations.

This required combining **AI-based perception with deterministic computer-vision and geometry algorithms**.

AI handles the difficult task of finding useful features in noisy and partially occluded images. Geometry then converts those features into repeatable engineering measurements.

**AI handles perception. Deterministic algorithms handle measurement.**

***

## Real-time vision architecture

For moving industrial equipment, latency matters as much as accuracy.

I developed the acquisition and processing pipeline so camera capture, inference, and measurement could operate concurrently rather than sequentially.

The system was designed around:

**Industrial Camera → Image Acquisition → AI Inference → Geometry → Process State → PLC / Operator**

The implementation included GPU-accelerated inference, concurrent image processing, latest-frame prioritization, industrial networking, and integration with the machine control system.

This made the architecture closer to a real-time robotics perception stack than a traditional image-analysis application.

***

## Building beyond the AI model

The project covered much more than model development.

It included:

- industrial camera and optics selection;
- field-of-view and resolution design;
- AI model training and deployment;
- computer-vision and geometric algorithms;
- real-time GPU processing;
- concurrent camera acquisition;
- industrial PC integration;
- camera and network communication;
- PLC integration;
- operator interfaces; and
- deployment in a harsh industrial environment.

Many of the most important design decisions were system-level decisions: camera placement, occlusion, environmental protection, latency, compute architecture, and how perception outputs should interact with automation.

***

## What I took from the project

This project reinforced an important principle for industrial AI:

**the model is only one part of the system.**

Reliable Physical AI requires perception, deterministic engineering logic, real-time software, hardware, networking, and control integration to work together.

The real challenge is not:

**Can AI recognize something?**

It is:

**Can perception become reliable information that a physical machine can use?**

That is the problem CoilSense was designed to solve.
