import { AppContext } from 'components/AppContext'
import { appContext, isAppContextAvailable } from 'components/AppContextProvider'
import { SharedUIContext } from 'components/SharedUIProvider'
import {
  createGeneralManageVault$,
  VaultType,
} from 'features/generalManageVault/generalManageVault'
import { GeneralManageVaultView } from 'features/generalManageVault/GeneralManageVaultView'
import {
  defaultMutableManageVaultState,
  MutableManageVaultState,
} from 'features/manageVault/manageVault'
import {
  MOCK_VAULT_ID,
  mockManageVault$,
  MockManageVaultProps,
} from 'helpers/mocks/manageVault.mock'
import { memoize } from 'lodash'
import React from 'react'
import { useEffect } from 'react'
import { EMPTY, of } from 'rxjs'
import { first } from 'rxjs/operators'
import { Card, Container, Grid } from 'theme-ui'

type ManageVaultStory = { title?: string } & MockManageVaultProps

export function manageVaultStory({
  title,
  account,
  balanceInfo,
  priceInfo,
  vault,
  ilkData,
  proxyAddress,
  collateralAllowance,
  daiAllowance,
}: ManageVaultStory = {}) {
  return ({
    depositAmount,
    withdrawAmount,
    generateAmount,
    paybackAmount,
    stage = 'collateralEditing',
    ...otherState
  }: Partial<MutableManageVaultState> = defaultMutableManageVaultState) => () => {
    const obs$ = mockManageVault$({
      account,
      balanceInfo,
      priceInfo,
      vault,
      ilkData,
      proxyAddress,
      collateralAllowance,
      daiAllowance,
    })

    useEffect(() => {
      const subscription = obs$
        .pipe(first())
        .subscribe(
          ({ injectStateOverride, accountIsController, priceInfo: { currentCollateralPrice } }) => {
            const newState: Partial<MutableManageVaultState> = {
              ...otherState,
              ...(stage && { stage }),
              ...(depositAmount && {
                depositAmount,
                depositAmountUSD: depositAmount.times(currentCollateralPrice),
              }),
              ...(withdrawAmount && {
                withdrawAmount,
                withdrawAmountUSD: withdrawAmount.times(currentCollateralPrice),
              }),
              ...(generateAmount && {
                generateAmount,
              }),
              ...(paybackAmount && {
                paybackAmount,
              }),
              showDepositAndGenerateOption:
                (stage === 'daiEditing' && !!depositAmount) ||
                (stage === 'collateralEditing' && !!generateAmount),
              showPaybackAndWithdrawOption:
                accountIsController &&
                ((stage === 'daiEditing' && !!withdrawAmount) ||
                  (stage === 'collateralEditing' && !!paybackAmount)),
            }

            injectStateOverride(newState || {})
          },
        )

      return subscription.unsubscribe()
    }, [])

    const ctx = ({
      vaultMultiplyHistory$: memoize(() => of([])),
      vaultHistory$: memoize(() => of([])),
      context$: of({ etherscan: 'url' }),
      generalManageVault$: memoize(() =>
        createGeneralManageVault$(
          // @ts-ignore, don't need to mock Multiply here
          () => of(EMPTY),
          () => of(EMPTY),
          () => obs$,
          () => of(VaultType.Borrow),
          () => of(EMPTY),
          MOCK_VAULT_ID,
        ),
      ),
      manageVault$: () => obs$,
    } as any) as AppContext

    return (
      <appContext.Provider value={ctx as any}>
        <SharedUIContext.Provider
          value={{
            vaultFormOpened: true,
            setVaultFormOpened: () => null,
            setVaultFormToggleTitle: () => null,
          }}
        >
          <ManageVaultStoryContainer title={title} />
        </SharedUIContext.Provider>
      </appContext.Provider>
    )
  }
}

const ManageVaultStoryContainer = ({ title }: { title?: string }) => {
  if (!isAppContextAvailable()) return null

  return (
    <Container variant="appContainer">
      <Grid>
        {title && <Card>{title}</Card>}
        <GeneralManageVaultView id={MOCK_VAULT_ID} />
      </Grid>
    </Container>
  )
}
