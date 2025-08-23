#!/bin/bash

# Junior Current Fall 2025 Schedule Update Script
# This script fetches the latest schedule from TeamSnap and updates the website

echo "🏆 Junior Current Fall 2025 Schedule Updater"
echo "=============================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Run the calendar parser
echo "🔄 Updating schedule from TeamSnap calendar..."
python3 parse_calendar.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Schedule update completed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Review the updated schedule on the website"
    echo "  2. Update game results after each match"
    echo "  3. Run this script again if new games are added to TeamSnap"
    echo ""
    echo "💡 To update a game result, edit js/schedule.js and set:"
    echo "     result: 'Win', 'Loss', or 'Tie'"
    echo "     score: 'X-Y' format"
    echo "     isPast: true"
else
    echo "❌ Schedule update failed. Check the error messages above."
    exit 1
fi