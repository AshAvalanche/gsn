import { defineConfig } from '@wagmi/cli'
import { foundry } from '@wagmi/cli/plugins'

export default defineConfig({
  out: 'src/generated.ts',
  plugins: [
    foundry({
      project: '../../',
      include: [
        'RelayHub',
        'RelayRegistrar',
        'StakeManager',
        'Penalizer',
        'Forwarder',
        'TestPaymasterEverythingAccepted',
        'TestPaymasterConfigurableMisbehavior',
        'TestPaymasterVerifying',
        'TestForwarder',
        'TestRelayWorkerContract',
        'IForwarder',
        'IRelayHub',
        'IPaymaster',
        'IPenalizer',
        'IRelayRegistrar',
        'IStakeManager',
        'IERC20Token',
        'IERC2771Recipient'
      ].map((name) => `${name}.sol/**`),
    }),
  ],
})
