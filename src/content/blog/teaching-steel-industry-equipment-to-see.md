---
title: Teaching Steel Industry Equipment to See
description: A practical look at how AI, computer vision, and deterministic geometry can work together to turn messy real-world perception into reliable measurements a machine can actually use.
kind: Post
pubDate: 2026-09-04
updatedDate: ''
tags:
  - Computer Vision
  - Industrial AI
  - Edge AI
  - Deep Learning
  - Real-Time Systems
  - Cloud Architecture
draft: false
heroImage: /hero/teaching-steel-industry-equipment-to-see.jpg
heroVideo: ''
heroVideoPlayback: loop
---

## First: what is a Coilbox?

Imagine a steel mill producing a very long, hot strip of steel.

Before that strip continues through the production line, it can be temporarily wound into a large coil. A **Coilbox** is the machine that performs and manages this coiling and uncoiling process.

The coil can be more than two meters in diameter, the steel is extremely hot, and everything is moving quickly.

Operators need to know things such as:

- Where is the end of the steel strip?
- Is the coil moving the way it should?
- Is the coil reasonably round?
- Has the steel uncoiled correctly?
- Is the next mechanical operation safe to perform?

![A Coilbox winding hot steel strip into a coil](/media/coilsense-coilbox.jpg)

Traditionally, much of this depends on operators watching the process.

**CoilSense asks a different question: what if the machine could see these things itself?**

***

## Giving the machine another sensor: vision

CoilSense is a computer-vision system designed to observe the Coilbox and convert camera images into useful information about what the machine is doing.

Instead of measuring just one variable, the same vision system can perform several tasks, including tracking, speed measurement, step completion verification, and geometric inspection.

In software terms, you can think of it as a **real-time perception service for a physical machine**.

Cameras provide the raw data. AI extracts important features. Geometry converts those features into measurements and metrics. The results are then exposed to operators and the machine's control system.

![Cameras to AI features to geometry to operator and control system](/media/coilsense-perception-pipeline.jpg)

***

## Why this is harder than normal computer vision

A steel mill is almost the opposite of a clean computer-vision dataset.

The cameras have to deal with:

- extreme heat;
- steam and dust;
- pieces of scale flying through the air;
- fast motion;
- limited installation space; and
- large pieces of machinery blocking parts of the image.

So the problem isn't simply:

> Find the coil in this image.

It is closer to:

> Find the important part of a fast-moving, partially hidden, glowing object while the environment keeps changing—and return an answer quickly enough for another machine to act on it.

That difference matters.

***

## From object detection to process understanding

One of the first tasks was tracking the **tail** of the coil—the exposed end of the steel strip.

Knowing that the tail exists is not enough. The system needs to know where it is and how it is oriented so the next mechanical step can happen correctly.

The vision pipeline therefore detects several related features, including the tail, the inner part of the coil, and the shape near the center of the coil. Those detections are then used to calculate useful geometry such as the tail angle.

This is an important distinction.

An ordinary AI demo might stop at:

**"Tail detected: 96% confidence."**

An industrial system needs to continue:

**"The tail is here, at this angle, at this moment, and the machine can use that information."**

***

## AI finds the features. Geometry does the measurement.

Another part of CoilSense evaluates the shape of the coil.

A poorly formed coil may not be perfectly round. That matters because its shape can affect how it moves and how it interacts with the equipment.

A purely mathematical solution is difficult because only part of the coil may be visible, equipment can hide sections of it, and the shape is not always a perfect ellipse.

So the system combines two approaches, classical computer-vision and geometry algorithms to analyze and calculate how much the shape deviates from the expected geometry.

That architecture is common in practical industrial AI:

**AI handles the messy perception problem.**
**Deterministic algorithms handle the engineering measurement.**

You don't necessarily want a neural network to guess a measurement if geometry can calculate it.

![The perception pipeline in operation](/hero/mid.jpg)

***

## Real-time software changes how you design the pipeline

Computer vision on moving machinery has another constraint:

**a correct answer that arrives too late can still be wrong.**

During development, the camera pipeline was redesigned so image acquisition could run independently from inference.

The camera operated at roughly 60 frames per second, while detection reached around 50 frames per second on the development hardware. One particularly useful design choice was to prioritize the **newest frame**. Skip stale information and process the newest state. The project used a last-in-first-out approach specifically to help reduce delay.

That lesson applies far beyond steel mills—to robotics, autonomous systems, video analytics, drones, and other real-time AI applications.

***

## The software does not end at the model

A production vision system needs much more than inference code.

CoilSense includes the pieces required to operate as part of industrial equipment:

- cameras and optics;
- protected camera enclosures;
- industrial computing and GPUs;
- networking;
- trained AI models;
- measurement algorithms;
- camera communication;
- communication with the machine controller;
- user interfaces; and
- data handling.

The computer communicates with the PLC—the industrial controller responsible for operating the machine.

That means the complete flow looks more like:

**Camera → AI → Geometry → Process State → PLC / Operator**

rather than simply:

**Image → Model → Prediction**

***

## Software architecture meets the physical world

This project reinforced something I think software engineers increasingly need to understand about AI systems.

In normal application development, many architecture decisions are about software boundaries.

In Physical AI, the architecture also includes the environment.

Where can the camera physically go?

What happens if steam blocks the image?

How wide should the field of view be?

How quickly must the answer reach the controller?

Can the hardware survive the temperature and contamination?

Those are software architecture decisions—but they cannot be solved inside software alone.

***

## Why this project matters

For software engineers, CoilSense is a useful example of what happens when AI leaves the browser and enters the physical world.

The model is important, but it is only one piece.

The complete system has to deal with:

**latency, concurrency, GPU inference, networking, hardware interfaces, sensor placement, environmental constraints, failure modes, geometry, industrial controls, and maintainability.**

And those pieces ultimately support very concrete outcomes: reduced unplanned downtime, improved product quality, longer equipment life, and safer operation.

The interesting engineering problem isn't simply:

**Can AI recognize something in an image?**

It is:

**Can we turn perception into reliable information that a real machine can use?**

That, to me, is the much more interesting future of AI.

***

## What comes next

Once a machine can visually understand individual events, the next step is understanding the complete process.

Tail position, coil motion, coil shape, uncoiling state, and material speed can become different signals describing one physical system.

That opens the door to richer anomaly detection, process optimization, predictive monitoring, and eventually more closed-loop automation.

The long-term idea is simple:

![CoilSense running alongside the machine](/hero/closing.jpg)
