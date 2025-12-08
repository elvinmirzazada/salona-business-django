#!/bin/bash

# Static Files Optimization Script
# This script optimizes static assets for production deployment

echo "🚀 Starting static files optimization..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in a Django project
if [ ! -f "manage.py" ]; then
    print_error "This script must be run from the Django project root directory"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    source .venv/bin/activate
    print_status "Activated virtual environment"
fi

# Clean previous static files
print_status "Cleaning previous static files..."
rm -rf staticfiles/
python manage.py collectstatic --noinput --clear

# Run custom optimization command
print_status "Analyzing and optimizing static files..."
python manage.py optimize_static --analyze --compress

# Verify optimization results
if [ -d "staticfiles" ]; then
    total_files=$(find staticfiles -type f | wc -l)
    total_size=$(du -sh staticfiles | cut -f1)
    compressed_files=$(find staticfiles -name "*.gz" | wc -l)

    print_status "Optimization completed:"
    echo "  📁 Total files: $total_files"
    echo "  📦 Total size: $total_size"
    echo "  🗜️  Compressed files: $compressed_files"

    # Check for large files that might need attention
    large_files=$(find staticfiles -type f -size +100k | wc -l)
    if [ $large_files -gt 0 ]; then
        print_warning "Found $large_files files larger than 100KB - consider optimization"
        find staticfiles -type f -size +100k -exec ls -lh {} \; | awk '{print "    " $9 " (" $5 ")"}'
    fi
else
    print_error "Static files collection failed"
    exit 1
fi

# Optional: Test gzip compression effectiveness
if command -v gzip &> /dev/null; then
    print_status "Testing compression effectiveness..."

    # Test CSS compression
    css_files=$(find staticfiles -name "*.css" | head -3)
    for file in $css_files; do
        if [ -f "$file" ]; then
            original_size=$(stat -c%s "$file")
            compressed_size=$(gzip -c "$file" | wc -c)
            reduction=$(( (original_size - compressed_size) * 100 / original_size ))
            echo "  📄 $(basename $file): ${reduction}% reduction"
        fi
    done
fi

print_status "Static files optimization completed successfully!"
echo ""
echo "🔧 To deploy these optimized assets:"
echo "   1. Commit the staticfiles/ directory (if using git)"
echo "   2. Deploy to your production server"
echo "   3. Ensure DEBUG=False in production settings"
echo ""
echo "📈 Performance benefits:"
echo "   • Long-term browser caching (1 year for static assets)"
echo "   • Gzip compression for text-based files"
echo "   • Immutable cache headers for versioned files"
echo "   • Optimized middleware for cache control"
