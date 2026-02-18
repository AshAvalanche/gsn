#!/usr/bin/env node

// extract ABI from Foundry-compiled files (out/)
// to a file format accepted by TruffleContract constructors (JSON with abi field)

const fs = require('fs')
const path = require('path')

let outAbiFolder
let contractsFolderToExtract
let files
let jsonFilesLocation

// Foundry output directory relative to root
const FOUNDRY_OUT = 'out'

if (process.argv.length >= 2 && process.argv[2] === 'paymasters') {
  outAbiFolder = 'packages/paymasters/src/interfaces/'
  contractsFolderToExtract = 'packages/paymasters/contracts/interfaces'
  files = fs.readdirSync(contractsFolderToExtract)
  files.push('PermitERC20UniswapV3Paymaster.sol')
  files.push('HashcashPaymaster.sol')
} else if (process.argv.length >= 2 && process.argv[2] === 'cli') {
  outAbiFolder = 'packages/cli/src/compiled/'
  // CLI needs specific contracts for deployment
  files = [
    'StakeManager.sol',
    'RelayHub.sol',
    'RelayRegistrar.sol',
    'Penalizer.sol',
    'TestPaymasterEverythingAccepted.sol',
    'Forwarder.sol',
    'TestWrappedNativeToken.sol'
  ]
} else {
  outAbiFolder = 'packages/common/src/interfaces/'
  contractsFolderToExtract = 'packages/contracts/src/interfaces'
  files = fs.readdirSync(contractsFolderToExtract)
  files.push('IForwarder.sol')
}

console.log(`Extracting ABIs from ${FOUNDRY_OUT} to ${outAbiFolder}...`)

files.forEach(file => {
  const c = file.replace(/.sol/, '')
  const contractFileName = file
  
  // Construct path to artifact
  const artifactPath = path.join(FOUNDRY_OUT, contractFileName, `${c}.json`)
  const outNodeFile = path.join(outAbiFolder, `${c}.json`)

  if (!fs.existsSync(artifactPath)) {
      console.warn(`Warning: Artifact not found for ${file} at ${artifactPath}`)
      return
  }

  try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, { encoding: 'utf8' }))
      if (!artifact.abi) {
          console.warn(`Warning: No ABI in artifact for ${file}`)
          return
      }
      
      fs.mkdirSync(path.dirname(outNodeFile), { recursive: true })
      
      let outputContent;
      if (process.argv[2] === 'cli') {
        // CLI needs bytecode for deployment
        outputContent = JSON.stringify({
          abi: artifact.abi,
          bytecode: artifact.bytecode.object,
          contractName: c
        }, null, 2)
      } else {
        // Interfaces only need ABI
        outputContent = JSON.stringify(artifact.abi)
      }

      fs.writeFileSync(outNodeFile, outputContent)
      console.log(`written "${outNodeFile}"`)
  } catch (e) {
      console.error(`Error processing ${file}: ${e.message}`)
  }
})
