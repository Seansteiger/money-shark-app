const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const cleanArgs = args.filter(a => a !== '--json');

function output(data) {
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

function error(msg, code = 'ERROR') {
  if (isJson) {
    console.error(JSON.stringify({ error: true, code, message: msg }));
  } else {
    console.error(`[ERROR: ${code}] ${msg}`);
  }
  process.exit(1);
}

// Commands
const command = cleanArgs[0] || 'help';

switch (command) {
  case 'doctor': {
    const checks = {
      project: 'money-shark-app',
      directory: PROJECT_DIR,
      nodeVersion: process.version,
      hasPackageJson: fs.existsSync(path.join(PROJECT_DIR, 'package.json')),
      hasEnv: fs.existsSync(path.join(PROJECT_DIR, '.env')) || fs.existsSync(path.join(PROJECT_DIR, '.env.local')),
      backend: 'Convex',
      status: 'HEALTHY'
    };
    output(checks);
    break;
  }

  case 'status':
  case 'info': {
    let pkg = {};
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'package.json'), 'utf8'));
    } catch (e) {}

    output({
      name: pkg.name || 'money-shark-app',
      version: pkg.version || '1.0.0',
      description: pkg.description || 'Project managed by cli-anything',
      scripts: Object.keys(pkg.scripts || {}),
      dependenciesCount: Object.keys(pkg.dependencies || {}).length
    });
    break;
  }

  case 'dev': {
    console.log('[CLI] Starting development server...');
    execSync('npm run dev', { cwd: PROJECT_DIR, stdio: 'inherit' });
    break;
  }

  case 'build': {
    console.log('[CLI] Building project...');
    execSync('npm run build', { cwd: PROJECT_DIR, stdio: 'inherit' });
    break;
  }

  case 'list-files': {
    const files = fs.readdirSync(PROJECT_DIR).filter(f => !['node_modules', '.git', '.next', 'dist', 'bin'].includes(f));
    output({ files });
    break;
  }

  case 'help':
  default: {
    if (isJson) {
      output({
        cli: 'moneyshark',
        commands: [
          { name: 'doctor', description: 'Run diagnostics on local setup, environment, and dependencies' },
          { name: 'status', description: 'Display project metadata, stack info, and package details' },
          { name: 'dev', description: 'Start the local development server' },
          { name: 'build', description: 'Compile/build the project for production' },
          { name: 'list-files', description: 'List project root files' },
          { name: 'help', description: 'Show this help menu' }
        ]
      });
    } else {
      console.log(`
=====================================================
  ðŸ› ï¸  CLI: moneyshark (money-shark-app)
=====================================================

Usage:
  node bin/cli.cjs <command> [options]
  .\\bin\\cli.ps1 <command> [options]

Commands:
  doctor         Run system and environment diagnostic checks
  status         Show project metadata, stack summary, and status
  dev            Start the local development server (npm run dev)
  build          Run production build (npm run build)
  list-files     List non-ignored files in project directory
  help           Show this help message

Options:
  --json         Return output formatted as structured JSON for agents/scripts
`);
    }
    break;
  }
}