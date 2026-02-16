import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type Fund = {
    $$type: 'Fund';
    queryId: bigint;
}

export function storeFund(src: Fund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2753303635, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadFund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2753303635) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function loadTupleFund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function loadGetterTupleFund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Fund' as const, queryId: _queryId };
}

export function storeTupleFund(source: Fund) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserFund(): DictionaryValue<Fund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFund(src)).endCell());
        },
        parse: (src) => {
            return loadFund(src.loadRef().beginParse());
        }
    }
}

export type Release = {
    $$type: 'Release';
    queryId: bigint;
}

export function storeRelease(src: Release) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(408342921, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadRelease(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 408342921) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function loadTupleRelease(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function loadGetterTupleRelease(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function storeTupleRelease(source: Release) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserRelease(): DictionaryValue<Release> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRelease(src)).endCell());
        },
        parse: (src) => {
            return loadRelease(src.loadRef().beginParse());
        }
    }
}

export type Refund = {
    $$type: 'Refund';
    queryId: bigint;
}

export function storeRefund(src: Refund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2214270485, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadRefund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2214270485) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function loadTupleRefund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function loadGetterTupleRefund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function storeTupleRefund(source: Refund) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserRefund(): DictionaryValue<Refund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRefund(src)).endCell());
        },
        parse: (src) => {
            return loadRefund(src.loadRef().beginParse());
        }
    }
}

export type Dispute = {
    $$type: 'Dispute';
    queryId: bigint;
}

export function storeDispute(src: Dispute) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(446414026, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDispute(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 446414026) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Dispute' as const, queryId: _queryId };
}

export function loadTupleDispute(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Dispute' as const, queryId: _queryId };
}

export function loadGetterTupleDispute(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Dispute' as const, queryId: _queryId };
}

export function storeTupleDispute(source: Dispute) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDispute(): DictionaryValue<Dispute> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDispute(src)).endCell());
        },
        parse: (src) => {
            return loadDispute(src.loadRef().beginParse());
        }
    }
}

export type Resolve = {
    $$type: 'Resolve';
    queryId: bigint;
    releaseToPublisher: boolean;
}

export function storeResolve(src: Resolve) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2442029911, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeBit(src.releaseToPublisher);
    };
}

export function loadResolve(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2442029911) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _releaseToPublisher = sc_0.loadBit();
    return { $$type: 'Resolve' as const, queryId: _queryId, releaseToPublisher: _releaseToPublisher };
}

export function loadTupleResolve(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _releaseToPublisher = source.readBoolean();
    return { $$type: 'Resolve' as const, queryId: _queryId, releaseToPublisher: _releaseToPublisher };
}

export function loadGetterTupleResolve(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _releaseToPublisher = source.readBoolean();
    return { $$type: 'Resolve' as const, queryId: _queryId, releaseToPublisher: _releaseToPublisher };
}

export function storeTupleResolve(source: Resolve) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeBoolean(source.releaseToPublisher);
    return builder.build();
}

export function dictValueParserResolve(): DictionaryValue<Resolve> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeResolve(src)).endCell());
        },
        parse: (src) => {
            return loadResolve(src.loadRef().beginParse());
        }
    }
}

export type ExtendDeadline = {
    $$type: 'ExtendDeadline';
    queryId: bigint;
    newDeadline: bigint;
}

export function storeExtendDeadline(src: ExtendDeadline) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2244072172, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeUint(src.newDeadline, 64);
    };
}

export function loadExtendDeadline(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2244072172) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newDeadline = sc_0.loadUintBig(64);
    return { $$type: 'ExtendDeadline' as const, queryId: _queryId, newDeadline: _newDeadline };
}

export function loadTupleExtendDeadline(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newDeadline = source.readBigNumber();
    return { $$type: 'ExtendDeadline' as const, queryId: _queryId, newDeadline: _newDeadline };
}

export function loadGetterTupleExtendDeadline(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newDeadline = source.readBigNumber();
    return { $$type: 'ExtendDeadline' as const, queryId: _queryId, newDeadline: _newDeadline };
}

export function storeTupleExtendDeadline(source: ExtendDeadline) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.newDeadline);
    return builder.build();
}

export function dictValueParserExtendDeadline(): DictionaryValue<ExtendDeadline> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeExtendDeadline(src)).endCell());
        },
        parse: (src) => {
            return loadExtendDeadline(src.loadRef().beginParse());
        }
    }
}

export type EscrowData = {
    $$type: 'EscrowData';
    dealId: bigint;
    advertiser: Address;
    publisher: Address;
    platformWallet: Address;
    totalAmount: bigint;
    publisherAmount: bigint;
    status: bigint;
    deadline: bigint;
    createdAt: bigint;
}

export function storeEscrowData(src: EscrowData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.dealId, 64);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.publisher);
        b_0.storeAddress(src.platformWallet);
        b_0.storeCoins(src.totalAmount);
        const b_1 = new Builder();
        b_1.storeCoins(src.publisherAmount);
        b_1.storeUint(src.status, 8);
        b_1.storeUint(src.deadline, 64);
        b_1.storeUint(src.createdAt, 64);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadEscrowData(slice: Slice) {
    const sc_0 = slice;
    const _dealId = sc_0.loadUintBig(64);
    const _advertiser = sc_0.loadAddress();
    const _publisher = sc_0.loadAddress();
    const _platformWallet = sc_0.loadAddress();
    const _totalAmount = sc_0.loadCoins();
    const sc_1 = sc_0.loadRef().beginParse();
    const _publisherAmount = sc_1.loadCoins();
    const _status = sc_1.loadUintBig(8);
    const _deadline = sc_1.loadUintBig(64);
    const _createdAt = sc_1.loadUintBig(64);
    return { $$type: 'EscrowData' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function loadTupleEscrowData(source: TupleReader) {
    const _dealId = source.readBigNumber();
    const _advertiser = source.readAddress();
    const _publisher = source.readAddress();
    const _platformWallet = source.readAddress();
    const _totalAmount = source.readBigNumber();
    const _publisherAmount = source.readBigNumber();
    const _status = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _createdAt = source.readBigNumber();
    return { $$type: 'EscrowData' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function loadGetterTupleEscrowData(source: TupleReader) {
    const _dealId = source.readBigNumber();
    const _advertiser = source.readAddress();
    const _publisher = source.readAddress();
    const _platformWallet = source.readAddress();
    const _totalAmount = source.readBigNumber();
    const _publisherAmount = source.readBigNumber();
    const _status = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _createdAt = source.readBigNumber();
    return { $$type: 'EscrowData' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function storeTupleEscrowData(source: EscrowData) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.dealId);
    builder.writeAddress(source.advertiser);
    builder.writeAddress(source.publisher);
    builder.writeAddress(source.platformWallet);
    builder.writeNumber(source.totalAmount);
    builder.writeNumber(source.publisherAmount);
    builder.writeNumber(source.status);
    builder.writeNumber(source.deadline);
    builder.writeNumber(source.createdAt);
    return builder.build();
}

export function dictValueParserEscrowData(): DictionaryValue<EscrowData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowData(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowData(src.loadRef().beginParse());
        }
    }
}

export type MonofactureEscrow$Data = {
    $$type: 'MonofactureEscrow$Data';
    dealId: bigint;
    advertiser: Address;
    publisher: Address;
    platformWallet: Address;
    totalAmount: bigint;
    publisherAmount: bigint;
    status: bigint;
    deadline: bigint;
    createdAt: bigint;
}

export function storeMonofactureEscrow$Data(src: MonofactureEscrow$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.dealId, 64);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.publisher);
        b_0.storeAddress(src.platformWallet);
        b_0.storeCoins(src.totalAmount);
        const b_1 = new Builder();
        b_1.storeCoins(src.publisherAmount);
        b_1.storeUint(src.status, 8);
        b_1.storeUint(src.deadline, 64);
        b_1.storeUint(src.createdAt, 64);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadMonofactureEscrow$Data(slice: Slice) {
    const sc_0 = slice;
    const _dealId = sc_0.loadUintBig(64);
    const _advertiser = sc_0.loadAddress();
    const _publisher = sc_0.loadAddress();
    const _platformWallet = sc_0.loadAddress();
    const _totalAmount = sc_0.loadCoins();
    const sc_1 = sc_0.loadRef().beginParse();
    const _publisherAmount = sc_1.loadCoins();
    const _status = sc_1.loadUintBig(8);
    const _deadline = sc_1.loadUintBig(64);
    const _createdAt = sc_1.loadUintBig(64);
    return { $$type: 'MonofactureEscrow$Data' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function loadTupleMonofactureEscrow$Data(source: TupleReader) {
    const _dealId = source.readBigNumber();
    const _advertiser = source.readAddress();
    const _publisher = source.readAddress();
    const _platformWallet = source.readAddress();
    const _totalAmount = source.readBigNumber();
    const _publisherAmount = source.readBigNumber();
    const _status = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _createdAt = source.readBigNumber();
    return { $$type: 'MonofactureEscrow$Data' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function loadGetterTupleMonofactureEscrow$Data(source: TupleReader) {
    const _dealId = source.readBigNumber();
    const _advertiser = source.readAddress();
    const _publisher = source.readAddress();
    const _platformWallet = source.readAddress();
    const _totalAmount = source.readBigNumber();
    const _publisherAmount = source.readBigNumber();
    const _status = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _createdAt = source.readBigNumber();
    return { $$type: 'MonofactureEscrow$Data' as const, dealId: _dealId, advertiser: _advertiser, publisher: _publisher, platformWallet: _platformWallet, totalAmount: _totalAmount, publisherAmount: _publisherAmount, status: _status, deadline: _deadline, createdAt: _createdAt };
}

export function storeTupleMonofactureEscrow$Data(source: MonofactureEscrow$Data) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.dealId);
    builder.writeAddress(source.advertiser);
    builder.writeAddress(source.publisher);
    builder.writeAddress(source.platformWallet);
    builder.writeNumber(source.totalAmount);
    builder.writeNumber(source.publisherAmount);
    builder.writeNumber(source.status);
    builder.writeNumber(source.deadline);
    builder.writeNumber(source.createdAt);
    return builder.build();
}

export function dictValueParserMonofactureEscrow$Data(): DictionaryValue<MonofactureEscrow$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMonofactureEscrow$Data(src)).endCell());
        },
        parse: (src) => {
            return loadMonofactureEscrow$Data(src.loadRef().beginParse());
        }
    }
}

 type MonofactureEscrow_init_args = {
    $$type: 'MonofactureEscrow_init_args';
    dealId: bigint;
    advertiser: Address;
    publisher: Address;
    platformWallet: Address;
    totalAmount: bigint;
    publisherAmount: bigint;
    deadline: bigint;
}

function initMonofactureEscrow_init_args(src: MonofactureEscrow_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.dealId, 257);
        b_0.storeAddress(src.advertiser);
        b_0.storeAddress(src.publisher);
        const b_1 = new Builder();
        b_1.storeAddress(src.platformWallet);
        b_1.storeInt(src.totalAmount, 257);
        b_1.storeInt(src.publisherAmount, 257);
        const b_2 = new Builder();
        b_2.storeInt(src.deadline, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

async function MonofactureEscrow_init(dealId: bigint, advertiser: Address, publisher: Address, platformWallet: Address, totalAmount: bigint, publisherAmount: bigint, deadline: bigint) {
    const __code = Cell.fromBoc(Buffer.from('b5ee9c7241022d010008e5000228ff008e88f4a413f4bcf2c80bed5320e303ed43d9011b02027102100201200308020120040601c5b5501da89a1a400031c45a67ff481f481f481f401a803a1f401a60fa67fa67e6020922090208e208c208ad8331c5f020203ae01f481f481a803a1f481020203ae01020203ae01a861a1020203ae0060208e208c208a0fa2aa0ae1f04625c5b678d9230050008f8276f1001c5b7251da89a1a400031c45a67ff481f481f481f401a803a1f401a60fa67fa67e6020922090208e208c208ad8331c5f020203ae01f481f481a803a1f481020203ae01020203ae01a861a1020203ae0060208e208c208a0fa2aa0ae1f04625c5b678d923007000228020120090b01c5b6973da89a1a400031c45a67ff481f481f481f401a803a1f401a60fa67fa67e6020922090208e208c208ad8331c5f020203ae01f481f481a803a1f481020203ae01020203ae01a861a1020203ae0060208e208c208a0fa2aa0ae1f04625c5b678d92300a0002240201200c0e01c5b34e3b51343480006388b4cffe903e903e903e803500743e8034c1f4cff4cfcc041244120411c41184115b06638be0404075c03e903e903500743e9020404075c020404075c0350c3420404075c00c0411c411841141f455415c3e08c4b8b6cf1b24600d00065343a101c5b1e8fb51343480006388b4cffe903e903e903e803500743e8034c1f4cff4cfcc041244120411c41184115b06638be0404075c03e903e903500743e9020404075c020404075c0350c3420404075c00c0411c411841141f455415c3e08c4b8b6cf1b24600f0008f82322be020120111301c5b8d0aed44d0d200018e22d33ffa40fa40fa40fa00d401d0fa00d307d33fd33f30104910481047104610456c198e2f810101d700fa40fa40d401d0fa40810101d700810101d700d430d0810101d7003010471046104507d1550570f82312e2db3c6c91812000222020120141601c5b4a6dda89a1a400031c45a67ff481f481f481f401a803a1f401a60fa67fa67e6020922090208e208c208ad8331c5f020203ae01f481f481a803a1f481020203ae01020203ae01a861a1020203ae0060208e208c208a0fa2aa0ae1f04625c5b678d923015000221020120171901c5b0aabb51343480006388b4cffe903e903e903e803500743e8034c1f4cff4cfcc041244120411c41184115b06638be0404075c03e903e903500743e9020404075c020404075c0350c3420404075c00c0411c411841141f455415c3e08c4b8b6cf1b24601800022301c5b3b4bb51343480006388b4cffe903e903e903e803500743e8034c1f4cff4cfcc041244120411c41184115b06638be0404075c03e903e903500743e9020404075c020404075c0350c3420404075c00c0411c411841141f455415c3e08c4b8b6cf1b26601a001254787654787654787602f830eda2edfb01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e22d33ffa40fa40fa40fa00d401d0fa00d307d33fd33f30104910481047104610456c198e2f810101d700fa40fa40d401d0fa40810101d700810101d700d430d0810101d7003010471046104507d1550570f82312e20ae302701c1d00045f0a04fc29d74920c21f913ae30d20c0002ac121b08ead303810685515db3cc87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54e0c0008eb508c21f8ead10685515db3cc87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db31e05f09925f0ae21e2b2b2c04b43109d31f218210a41c1453ba8eaf5b3810685515db3cc87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db31e02182101856d189bae30221821083fb1615bae3022182101a9bbccaba2b1f212301fc5b38811bf9f84225c705f2f481559701c001f2f472708100a0882655205a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0010685515c87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db3120002400000000657363726f775f72656c6561736502de5b38f84224c705f84227c705209a8200ac39f8232bbef2f4de8200a5c30292307fdef2f481559701c001f2f473708100a0882855205a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00106855152228002200000000657363726f775f726566756e6403d88e4a5b38f84226c705f84226c7058200a5c30292307fdef2f481559701c001f2f455157402c87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db31e0218210918e6b57bae30221821085c1d2ecbae302218210946a98b6bae3023024292a03ca313908d33f31d200308200da98f84226c705f2f48200f26e02c00412f2f48ebf73708100a0882855205a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00e30d10685515252628002400000000646973707574655f726566756e64017e72708100a0882655205a6d6d40037fc8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0027002600000000646973707574655f72656c65617365004ec87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db3100be3a5b07d33f31d33f3082008005f84225c705f2f481250b28c001917f9328c004e2f2f481295cf8235220bcf2f41068105710461035440302c87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db3100d4313908d33f30c8018210aff90f5758cb1fcb3fc9107910681057104610354430f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055805089cb3f16ce14ce12ce01fa02c858fa0212cb0712cb3f12cb3fcdc9ed54db31003c228e1a328200e8dcf84228c705f2f48200ca2af8276f1025bef2f47102df0006f2c082d29851c6', 'hex'))[0];
    const builder = beginCell();
    builder.storeUint(0, 1);
    initMonofactureEscrow_init_args({ $$type: 'MonofactureEscrow_init_args', dealId, advertiser, publisher, platformWallet, totalAmount, publisherAmount, deadline })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const MonofactureEscrow_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    7161: { message: "Only platform can release" },
    9483: { message: "Invalid state" },
    10588: { message: "Deadline must be future" },
    21911: { message: "Escrow not funded" },
    32773: { message: "Only platform can extend" },
    42435: { message: "Not authorized" },
    44089: { message: "Deadline not passed" },
    51754: { message: "Insufficient funds" },
    55960: { message: "Only platform can resolve" },
    59612: { message: "Only advertiser can fund" },
    62062: { message: "Not disputed" },
} as const

export const MonofactureEscrow_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Only platform can release": 7161,
    "Invalid state": 9483,
    "Deadline must be future": 10588,
    "Escrow not funded": 21911,
    "Only platform can extend": 32773,
    "Not authorized": 42435,
    "Deadline not passed": 44089,
    "Insufficient funds": 51754,
    "Only platform can resolve": 55960,
    "Only advertiser can fund": 59612,
    "Not disputed": 62062,
} as const

const MonofactureEscrow_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Fund","header":2753303635,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Release","header":408342921,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Refund","header":2214270485,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Dispute","header":446414026,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Resolve","header":2442029911,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"releaseToPublisher","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"ExtendDeadline","header":2244072172,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"EscrowData","header":null,"fields":[{"name":"dealId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"publisher","type":{"kind":"simple","type":"address","optional":false}},{"name":"platformWallet","type":{"kind":"simple","type":"address","optional":false}},{"name":"totalAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"publisherAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"createdAt","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"MonofactureEscrow$Data","header":null,"fields":[{"name":"dealId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"advertiser","type":{"kind":"simple","type":"address","optional":false}},{"name":"publisher","type":{"kind":"simple","type":"address","optional":false}},{"name":"platformWallet","type":{"kind":"simple","type":"address","optional":false}},{"name":"totalAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"publisherAmount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"createdAt","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
]

const MonofactureEscrow_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "Fund": 2753303635,
    "Release": 408342921,
    "Refund": 2214270485,
    "Dispute": 446414026,
    "Resolve": 2442029911,
    "ExtendDeadline": 2244072172,
}

const MonofactureEscrow_getters: ABIGetter[] = [
    {"name":"escrowData","methodId":130770,"arguments":[],"returnType":{"kind":"simple","type":"EscrowData","optional":false}},
    {"name":"status","methodId":101642,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"totalAmount","methodId":87225,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"publisherAmount","methodId":123562,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"platformFee","methodId":93496,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"deadline","methodId":116022,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"isExpired","methodId":96163,"arguments":[],"returnType":{"kind":"simple","type":"bool","optional":false}},
    {"name":"dealId","methodId":80168,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"lockedBalance","methodId":68224,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
]

export const MonofactureEscrow_getterMapping: { [key: string]: string } = {
    'escrowData': 'getEscrowData',
    'status': 'getStatus',
    'totalAmount': 'getTotalAmount',
    'publisherAmount': 'getPublisherAmount',
    'platformFee': 'getPlatformFee',
    'deadline': 'getDeadline',
    'isExpired': 'getIsExpired',
    'dealId': 'getDealId',
    'lockedBalance': 'getLockedBalance',
}

const MonofactureEscrow_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"empty"}},
    {"receiver":"internal","message":{"kind":"text"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Fund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Release"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Refund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Dispute"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Resolve"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ExtendDeadline"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export const STATUS_PENDING = 0n;
export const STATUS_FUNDED = 1n;
export const STATUS_RELEASED = 2n;
export const STATUS_REFUNDED = 3n;
export const STATUS_DISPUTED = 4n;
export const MIN_TON_FOR_STORAGE = 10000000n;

export class MonofactureEscrow implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = MonofactureEscrow_errors_backward;
    public static readonly opcodes = MonofactureEscrow_opcodes;
    
    static async init(dealId: bigint, advertiser: Address, publisher: Address, platformWallet: Address, totalAmount: bigint, publisherAmount: bigint, deadline: bigint) {
        return await MonofactureEscrow_init(dealId, advertiser, publisher, platformWallet, totalAmount, publisherAmount, deadline);
    }
    
    static async fromInit(dealId: bigint, advertiser: Address, publisher: Address, platformWallet: Address, totalAmount: bigint, publisherAmount: bigint, deadline: bigint) {
        const __gen_init = await MonofactureEscrow_init(dealId, advertiser, publisher, platformWallet, totalAmount, publisherAmount, deadline);
        const address = contractAddress(0, __gen_init);
        return new MonofactureEscrow(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new MonofactureEscrow(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  MonofactureEscrow_types,
        getters: MonofactureEscrow_getters,
        receivers: MonofactureEscrow_receivers,
        errors: MonofactureEscrow_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: null | string | Fund | Release | Refund | Dispute | Resolve | ExtendDeadline | Deploy) {
        
        let body: Cell | null = null;
        if (message === null) {
            body = new Cell();
        }
        if (typeof message === 'string') {
            body = beginCell().storeUint(0, 32).storeStringTail(message).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Fund') {
            body = beginCell().store(storeFund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Release') {
            body = beginCell().store(storeRelease(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Refund') {
            body = beginCell().store(storeRefund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Dispute') {
            body = beginCell().store(storeDispute(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Resolve') {
            body = beginCell().store(storeResolve(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ExtendDeadline') {
            body = beginCell().store(storeExtendDeadline(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getEscrowData(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('escrowData', builder.build())).stack;
        const result = loadGetterTupleEscrowData(source);
        return result;
    }
    
    async getStatus(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('status', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getTotalAmount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('totalAmount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getPublisherAmount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('publisherAmount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getPlatformFee(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('platformFee', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getDeadline(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('deadline', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getIsExpired(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('isExpired', builder.build())).stack;
        const result = source.readBoolean();
        return result;
    }
    
    async getDealId(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('dealId', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getLockedBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('lockedBalance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
}