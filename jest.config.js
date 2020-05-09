module.exports = {
  preset: 'ts-jest',
  rootDir: '.',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules'
  ],
  "moduleFileExtensions": [
    "js",
    "ts"
  ],
  coverageReport