import { useState, useEffect, useRef, useCallback } from 'react'
import { ApiPromise, WsProvider } from '@polkadot/api'
import { formatBalance } from '@polkadot/util'

export function useChain(rpcUrl = 'ws://127.0.0.1:9944') {
  const [api, setApi] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const [chainInfo, setChainInfo] = useState(null)
  const [bestBlock, setBestBlock] = useState(null)
  const [finalizedBlock, setFinalizedBlock] = useState(null)
  const [validators, setValidators] = useState([])
  const [recentBlocks, setRecentBlocks] = useState([])
  const [recentTxs, setRecentTxs] = useState([])
  const apiRef = useRef(null)
  const unsubsRef = useRef([])
  const seenBlocksRef = useRef(new Set())
  const seenTxsRef = useRef(new Set())

  const connect = useCallback(async () => {
    setStatus('connecting')
    setChainInfo(null)
    setBestBlock(null)
    setFinalizedBlock(null)
    setValidators([])
    setRecentBlocks([])
    setRecentTxs([])
    seenBlocksRef.current = new Set()
    seenTxsRef.current = new Set()
    try {
      const provider = new WsProvider(rpcUrl)
      const newApi = await ApiPromise.create({ provider })
      apiRef.current = newApi
      const [chain, name, version] = await Promise.all([
        newApi.rpc.system.chain(),
        newApi.rpc.system.name(),
        newApi.rpc.system.version(),
      ])
      formatBalance.setDefaults({ decimals: 12, unit: 'POT' })
      setChainInfo({ chain: chain.toString(), name: name.toString(), version: version.toString() })
      const unsubHeads = await newApi.rpc.chain.subscribeNewHeads(async (header) => {
        const blockNum = header.number.toNumber()
        const blockHash = header.hash.toHex()
        if (seenBlocksRef.current.has(blockNum)) return
        seenBlocksRef.current.add(blockNum)
        setBestBlock({ number: blockNum, hash: blockHash })
        setRecentBlocks(prev => [{ number: blockNum, hash: blockHash, time: Date.now() }, ...prev].slice(0, 50))
        try {
          const block = await newApi.rpc.chain.getBlock(blockHash)
          block.block.extrinsics.forEach((ex, i) => {
            const txId = `${blockNum}-${i}`
            if (seenTxsRef.current.has(txId)) return
            seenTxsRef.current.add(txId)
            const method = ex.method.section
            const call = ex.method.method
            const signer = ex.isSigned ? ex.signer.toString() : null
            setRecentTxs(prev => [{ id: txId, block: blockNum, hash: blockHash, method, call, signer, time: Date.now() }, ...prev].slice(0, 200))
          })
        } catch {}
      })
      const unsubFinalized = await newApi.rpc.chain.subscribeFinalizedHeads((header) => {
        setFinalizedBlock({ number: header.number.toNumber(), hash: header.hash.toHex() })
      })
      try {
        const session = await newApi.query.session.validators()
        setValidators(session.map(v => v.toString()))
      } catch {}
      unsubsRef.current = [unsubHeads, unsubFinalized]
      setApi(newApi)
      setStatus('connected')
    } catch (err) {
      console.error('Chain connection error:', err)
      setStatus('error')
    }
  }, [rpcUrl])

  useEffect(() => {
    connect()
    return () => {
      unsubsRef.current.forEach(unsub => { try { unsub() } catch {} })
      if (apiRef.current) { try { apiRef.current.disconnect() } catch {} }
    }
  }, [rpcUrl])

  const getBalance = useCallback(async (address) => {
    if (!apiRef.current) return null
    try {
      const { data } = await apiRef.current.query.system.account(address)
      return { free: formatBalance(data.free, { forceUnit: '-' }), reserved: formatBalance(data.reserved, { forceUnit: '-' }), raw: data.free }
    } catch { return null }
  }, [])

  const getIdentity = useCallback(async (address) => {
    if (!apiRef.current) return null
    try {
      const identity = await apiRef.current.query.identity.identityOf(address)
      if (identity.isSome) {
        const { info } = identity.unwrap()
        return {
          display: info.display?.asRaw?.toHuman() || info.display?.toHuman() || null,
          email: info.email?.asRaw?.toHuman() || null,
          twitter: info.twitter?.asRaw?.toHuman() || null,
          web: info.web?.asRaw?.toHuman() || null,
        }
      }
      return null
    } catch { return null }
  }, [])

  const getSigner = useCallback(async (address) => {
    const injected = window.injectedWeb3 || {}
    for (const key of Object.keys(injected)) {
      try {
        const ext = await injected[key].enable('PortalHouse')
        const accs = await ext.accounts.get()
        const match = accs.find(a => a.address === address)
        if (match && ext.signer) return ext.signer
      } catch {}
    }
    try {
      const { web3FromAddress } = await import('@polkadot/extension-dapp')
      const inj = await web3FromAddress(address)
      return inj.signer
    } catch {}
    throw new Error('No signer found. Make sure your wallet is connected.')
  }, [])

  return {
    api: apiRef.current, status, chainInfo, bestBlock, finalizedBlock,
    validators, recentBlocks, recentTxs, getBalance, getIdentity, getSigner,
    reconnect: connect,
  }
}
