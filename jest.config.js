module.exports = {
    preset: 'ts-jest',
    testEnvironemt: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['json', 'lcov', 'text']
}