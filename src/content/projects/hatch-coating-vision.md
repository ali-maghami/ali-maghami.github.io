---
title: StripSense
description: Measuring Reflective Surfaces with Stereo Vision
stage: piloted
purpose: Measuring moving reflective surfaces without touching them—and without placing sensitive cameras close to heat, dust, or contamination.
contributors:
  - Sina Alborzi
category: active
pubDate: 2024-12-01
tags:
  - Computer Vision
  - Stereo Vision
  - 3D Reconstruction
  - Structured Light
  - Systems Architecture
repoUrl: ''
liveUrl: ''
heroImage: ../../assets/work/Gemini_Generated_Image_mnvwasmnvwasmnvw (1)-1.jpg
cardColor: '#4f95cf'
cardColorAlt: '#c066c2'
featured: true
---

## Most vision systems fight reflection

Reflective materials are notoriously difficult for computer vision. Glare can hide texture, wash out edges, and make conventional illumination unreliable.

This project began with the opposite idea: **what if the reflection is the signal?**

Instead of trying to see the surface directly, the system observes the reflection of a known light pattern. When the surface moves, tilts, or curves, that pattern changes in predictable ways. Multiple synchronized cameras see those changes from different viewpoints and use stereo geometry to reconstruct the surface in 3D.

The result is a non-contact machine-vision system that can measure a moving reflective sheet while the cameras and computing hardware remain at a practical distance.

***

## How it works

1. **Create a visual reference.** A light fixture produces a pattern of long lines and reference features near the measurement area.
2. **Let the surface reshape the pattern.** The reflective surface acts like a changing mirror. Its position and curvature alter where the lines appear, how they bend, and how far apart they look.
3. **Observe from several angles.** Two or more synchronized cameras capture the reflected features at the same instant. Synchronization matters because the surface is moving.
4. **Reconstruct the geometry.** Corresponding features are matched across the camera views and triangulated into 3D points. Those points form a live model of the surface and its edges.

***

## A reference frame that updates itself

Recovering 3D points is only part of the problem. Measurements must also remain meaningful when nearby equipment shifts or tilts.

To handle this, the cameras track reference markers fixed to the light fixture. Those markers define a local coordinate system that is recalculated with every measurement. Surface position, orientation, and shape are therefore reported relative to the equipment—not just relative to the cameras.

This small architectural decision makes the system much more useful in the field. It separates real surface movement from changes in the measurement setup.

***

## From pixels to useful geometry

The reconstructed surface supports several measurements at once:

- edge position, width, and lateral alignment;
- distance from a reference position;
- orientation and angular skew;
- curvature and shape across the width; and
- gradual movement as well as short transient changes.

Together, these outputs turn camera images into spatial information that another automation or control system can use. That is the connection to Physical AI: reliable perception becomes a practical input for decisions and action in the physical world.

***

## Architecture is part of the algorithm

The project was designed for a demanding production environment, so the hardware layout mattered as much as the vision code.

The light pattern—the simpler and more robust part of the setup—was placed near the surface. The cameras, optics, electronics, and processing computer were kept farther away. Three synchronized cameras provided overlapping viewpoints and redundancy, while a low-latency data link carried images to an industrial computer for real-time processing.

This separation reduced exposure of sensitive components and made the system easier to maintain. It also demonstrates a lesson that applies well beyond this project: a strong computer-vision solution is a complete system, not only an image-processing model.

***

## What the pilot showed

The system was tested continuously for two months on a production line with moving reflective sheets up to 72 inches wide. Surface finish and operating conditions changed during the trial, but the line pattern remained detectable and the system continued to track edges, movement, and curvature.

Two comparisons helped validate the measurements:

- **Width:** the vision measurement closely followed the production reference across several sheet widths. Typical differences were approximately 0–4 mm. The study attributes much of that gap to real in-process effects—including material tolerance, thermal expansion, and surface curvature—rather than treating it simply as sensor error.
- **Position:** the measured center position showed strong agreement with an independent laser sensor during a three-hour comparison, with small and bounded differences for most of the test.

The trial also exposed the practical limits. Clear optical access and clean protective windows remain important for long-term operation. Even so, maintenance during the pilot was minimal, and changing reflectivity did not prevent reliable feature detection.

***

## Why this project matters

This work reframes a familiar machine-vision problem. A shiny surface does not have to be an obstacle; with the right optical setup, its reflections can carry rich geometric information.

More broadly, the project brings together several areas I care about: computer vision, stereo vision, 3D reconstruction, real-time software, systems architecture, and intelligent automation. The interesting part is not any one algorithm. It is how optics, geometry, hardware, and software work together to turn a difficult measurement problem into a system that can operate in the field.

***

## What comes next

The next steps are longer-duration trials, improved measurement sensitivity, and tighter integration with automated control. The same principle may also extend to other reflective materials and applications where direct contact is undesirable or conventional sensing is difficult.

***

**Patent:** [Vision method and system for coating processes and systems — WO2026039905A1](https://patents.google.com/patent/WO2026039905A1/en)

**Related work:** _Vision-Based Non-Contact Measurement of Strip Deformation and Position in Continuous Galvanizing Lines_ (technical paper and presentation, 2026).
