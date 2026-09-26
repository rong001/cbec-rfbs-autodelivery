import { OzonAdapter } from './ozon.adapter';

describe('OzonAdapter', () => {
  const originalClientId = process.env.OZON_CLIENT_ID;
  const originalApiKey = process.env.OZON_API_KEY;
  const originalMode = process.env.OZON_MODE;

  beforeEach(() => {
    delete process.env.OZON_CLIENT_ID;
    delete process.env.OZON_API_KEY;
    delete process.env.OZON_MODE;
  });

  afterAll(() => {
    if (originalClientId === undefined) delete process.env.OZON_CLIENT_ID;
    else process.env.OZON_CLIENT_ID = originalClientId;
    if (originalApiKey === undefined) delete process.env.OZON_API_KEY;
    else process.env.OZON_API_KEY = originalApiKey;
    if (originalMode === undefined) delete process.env.OZON_MODE;
    else process.env.OZON_MODE = originalMode;
  });

  it('reports NOT_CONFIGURED and never returns synthetic orders without keys', async () => {
    const adapter = new OzonAdapter();

    expect(adapter.getStatus()).toMatchObject({
      provider: 'OZON',
      status: 'NOT_CONFIGURED',
      configured: false,
      live: false,
    });
    await expect(adapter.listOrdersPage()).resolves.toMatchObject({
      status: 'NOT_CONFIGURED',
      configured: false,
      live: false,
      httpAttempted: false,
    });
  });

  it('does not promote credentials to live and does not fake a read', async () => {
    process.env.OZON_CLIENT_ID = 'test-client-id';
    process.env.OZON_API_KEY = 'test-api-key';
    const adapter = new OzonAdapter();

    expect(adapter.getStatus()).toMatchObject({
      status: 'AUTHORIZED_UNTESTED',
      configured: true,
      live: false,
    });
    await expect(adapter.listOrdersPage()).resolves.toMatchObject({
      status: 'AUTHORIZED_UNTESTED',
      configured: true,
      live: false,
      httpAttempted: false,
      httpStatus: 501,
    });
  });
});
