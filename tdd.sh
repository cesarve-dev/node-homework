if [ $# -gt 0 ]; then
    pattern="^tdd/$1\\.test\\.js$"
else
    pattern="^tdd/.+\\.test\\.js"
fi
npx jest --testPathPatterns "$pattern" --detectOpenHandles
