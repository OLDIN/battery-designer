# 🔋 E-Bike Battery Designer

![App Screenshot](./docs/screenshot.png)

A complete web-based tool for designing custom E-Bike battery packs. This application allows you to visually plan the layout of battery cells within custom geometric shapes (like a bicycle frame triangle), calculating optimal placement using a honeycomb cell packing algorithm.

## ✨ Features

- **Interactive Millimeter Grid**: 1:1 scale mapping using a fixed coordinate system.
- **"Photoshop-Style" Workspace**: Upload a photo of your bike/frame, scale it to match real-world millimeter dimensions, and lock it in place.
- **Global Camera Pan & Zoom**: Navigate your workspace and inspect tight corners effortlessly.
- **Honeycomb Cell Packing Algorithm**: Automatically calculates the absolute maximum number of cells that can physically fit inside your drawn polygon, with optional +1.5mm spacing for cell holders.
- **Real-Time Pack Statistics**: Dynamically calculates Total Capacity (Ah), Nominal Voltage (V), Total Energy (Wh), Maximum Continuous Discharge (A), and Estimated Weight (kg).
- **Standalone Mode**: Can work entirely in the browser without a backend. Import/Export projects as `.json` files.
- **Project Management System**: Save, name, update, delete, and load your custom battery configurations instantly from the (optional) database.

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Vanilla CSS.
- **Backend (Optional)**: NestJS, TypeScript, TypeORM, SQLite.

## 🚀 Modes of Operation

### 🌐 Standalone Mode (Recommended for Deployment)
To run the app without a backend (e.g., for GitHub Pages):
1. Create a `.env` file in the `frontend` directory:
   ```bash
   VITE_STANDALONE=true
   ```
2. Build the app:
   ```bash
   cd frontend
   npm run build
   ```
3. Deploy the `dist` folder to any static hosting.

### 🏠 Local Development (with Database)
1. **Start the Backend**:
   ```bash
   cd backend
   npm install
   npm run start:dev
   ```
2. **Start the Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 💡 How to use

1. **Select Cell Type**: Pick your desired battery cell model from the sidebar.
2. **Setup Voltage/Capacity**: Choose the required Voltage (e.g., 20S / 72V) and parallel configuration.
3. **Upload Photo**: Click **Upload Photo** and drop in a picture of your bike frame.
4. **Calibrate Dimensions**: Measure a tube on your real bike. Using the red dimension labels on the polygon edges, stretch the polygon so it mimics that real-world measurement. Then, pan and zoom your photo to perfectly align with that line.
5. **Lock Workspace**: Check the **Workspace Locked** button to lock the photo to the millimeter grid.
6. **Draw**: Drag the white nodes to trace the inner bounds of your frame triangle.
7. **Save/Export**: Use the **Database Management** to save to the local DB or **File Storage** to download a `.json` backup.

## 📝 License

This project is licensed under the MIT License.
