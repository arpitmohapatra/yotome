#!/usr/bin/env python3
"""
Simple test script to verify the Yotome RAG Assistant setup.
This script checks if all dependencies are installed and the basic configuration is correct.
"""

import sys
import subprocess
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.11+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("❌ Python 3.11+ is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_node_version():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip()
            print(f"✅ Node.js {version}")
            return True
        else:
            print("❌ Node.js not found")
            return False
    except FileNotFoundError:
        print("❌ Node.js not installed")
        return False

def check_backend_deps():
    """Check if backend dependencies can be imported"""
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return False
    
    # Change to backend directory
    original_path = sys.path.copy()
    sys.path.insert(0, str(backend_path))
    
    try:
        import fastapi
        import uvicorn
        import chromadb
        import openai
        import langchain
        print("✅ Backend dependencies available")
        return True
    except ImportError as e:
        print(f"❌ Backend dependency missing: {e}")
        return False
    finally:
        sys.path = original_path

def check_frontend_deps():
    """Check if frontend dependencies are installed"""
    frontend_path = Path("frontend")
    node_modules = frontend_path / "node_modules"
    
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    if not node_modules.exists():
        print("❌ Frontend dependencies not installed (run 'npm install' in frontend)")
        return False
    
    print("✅ Frontend dependencies installed")
    return True

def check_env_file():
    """Check if .env file exists and has required variables"""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found (copy from env.example)")
        return False
    
    required_vars = [
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_DEPLOYMENT",
        "AZURE_OPENAI_EMBED_DEPLOYMENT"
    ]
    
    env_content = env_file.read_text()
    missing_vars = []
    
    for var in required_vars:
        if f"{var}=" not in env_content or f"{var}=your-" in env_content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing or unconfigured environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ Environment configuration found")
    return True

def check_directories():
    """Check if required directories exist"""
    required_dirs = [
        "backend",
        "frontend",
        "backend/rag"
    ]
    
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            print(f"❌ Required directory missing: {dir_path}")
            return False
    
    print("✅ Project structure verified")
    return True

def main():
    """Run all checks"""
    print("🔍 Yotome RAG Assistant Setup Check\n")
    
    checks = [
        ("Python Version", check_python_version),
        ("Node.js Version", check_node_version),
        ("Project Structure", check_directories),
        ("Environment Configuration", check_env_file),
        ("Backend Dependencies", check_backend_deps),
        ("Frontend Dependencies", check_frontend_deps),
    ]
    
    passed = 0
    total = len(checks)
    
    for name, check_func in checks:
        print(f"\n{name}:")
        if check_func():
            passed += 1
        else:
            print(f"  Fix this issue before proceeding")
    
    print(f"\n{'='*50}")
    print(f"Setup Check Results: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 All checks passed! You can now start the application:")
        print("   make dev        # Start development servers")
        print("   make docker-up  # Start with Docker")
        return 0
    else:
        print(f"\n❌ {total - passed} issues need to be resolved before starting")
        return 1

if __name__ == "__main__":
    sys.exit(main())
