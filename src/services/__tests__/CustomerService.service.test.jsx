import CustomerService from "@/services/CustomerService";
import axiosClient from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiconfig";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("CustomerService.getOrdersByCustomer", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes orders when the endpoint succeeds", async () => {
    axiosClient.get.mockResolvedValue({
      data: [
        {
          id: 3,
          userId: 9,
          orderName: "123",
          type: "ao",
          size: "XXL",
          color: "Do",
          quantity: 99,
          cpu: 12000,
          startDate: "2026-04-02",
          endDate: "2026-04-03",
          image: "https://example.com/image.png",
          status: "Da Chap Nhan",
        },
      ],
      pageIndex: 0,
      pageSize: 10,
      recordCount: 1,
    });

    const response = await CustomerService.getOrdersByCustomer(9, {
      PageIndex: 0,
      PageSize: 10,
    });

    expect(axiosClient.get).toHaveBeenCalledWith(
      API_ENDPOINTS.CUSTOMER.GET_ORDERS_BY_CUSTOMER(9),
      { params: { PageIndex: 0, PageSize: 10 } }
    );
    expect(response.recordCount).toBe(1);
    expect(response.data).toEqual([
      expect.objectContaining({
        id: 3,
        userId: 9,
        orderName: "123",
      }),
    ]);
  });

  it("returns an empty collection when backend uses 404 for customers without orders", async () => {
    axiosClient.get.mockRejectedValue({
      response: {
        status: 404,
      },
    });

    const response = await CustomerService.getOrdersByCustomer(1, {
      PageIndex: 2,
      PageSize: 10,
    });

    expect(response).toEqual({
      data: [],
      pageIndex: 2,
      pageSize: 10,
      recordCount: 0,
    });
  });
});
