---
title: 'Robotic Bin Picking with Synthetic Data & Deep Learning'
description: 'End-to-end 3D perception pipeline for automated bin picking using synthetic data and deep learning.'
type: 'previous'
pubDate: 2022-03-15
tags: ['Deep Learning', 'Robotics', 'Synthetic Data', 'Computer Vision', 'Point Cloud Processing']
featured: false
heroImage: '../../assets/work/bin-picking-instance-segmentation.png'
---

## Overview

Developed a complete 3D perception pipeline for robotic bin picking applications, leveraging synthetic data generation and deep learning for object localization and grasp planning.

![Synthetic data generation in Blender: a photorealistic render is turned into instance segmentation masks, pickup-target keypoints and a target reachability class.](../../assets/work/bin-picking-synthetic-data.png)

Training data was generated entirely in Blender from CAD, with pre-defined lid, side and bottom pickup regions mapped onto each part and labelled by whether the robot could actually reach them.

## Domain Randomization

To close the gap between synthetic training data and the real bin, every render randomized camera intrinsics and pose, lighting direction, intensity, colour and count, background and environment, object materials, object pose and scene composition, and sensor and image effects.

![Instance segmentation predicted on a real bin of parts, with per-object masks and bounding boxes.](../../assets/work/bin-picking-domain-randomization.png)

![Predicted pickup keypoints on a real part, labelling the reachable lid, side and bottom grasp regions.](../../assets/work/bin-picking-pick-keypoints.png)

## Contributions

- Built automated 3D data generation framework for training dataset creation
- Trained instance segmentation models on synthetic data for real-world transfer
- Implemented point-cloud processing for pose estimation and grasp planning
- Developed distributed client-server framework for parallel data generation

## Inference and Grasp Selection

At run time the RGB keypoint and reachability predictions are lifted onto the colored 3D point cloud to compute a 6DoF frame for each candidate part, which is then scored to propose the next pick.

![Colored 3D point cloud with per-part 6DoF frames computed from the RGB keypoint and reachability predictions.](../../assets/work/bin-picking-6dof-inference.jpg)

![Scored pick targets proposed across the bin, each drawn with its approach frame.](../../assets/work/bin-picking-target-scoring.jpg)

## Technologies

PyTorch, Mask R-CNN, OpenCV, Open3D, Robot OS (ROS), Blender API, Python

