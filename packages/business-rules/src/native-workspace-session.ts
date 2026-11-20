import { nativeWorkspaces, workspaceActions } from "./native-workspaces";
type API = (action: string, data?: any) => Promise<any>;
/** No local business state: a submission is successful only after its authenticated API response. */
export class NativeWorkspaceSession {
  private generation = 0;
  private submitting = false;
  private needsReadback = false;
  constructor(
    private api: API,
    private userId: string,
    private role: string,
  ) {}
  setApi(api: API) {
    this.api = api;
  }
  confirmReadback() {
    if (!this.submitting) this.needsReadback = false;
  }
  dispose() {
    this.generation++;
  }
  async submit(moduleKey: string, action: string, input: any) {
    if (this.needsReadback)
      throw Object.assign(
        Error(
          "The previous write has an unknown outcome. Close this sheet and refresh the records before another change.",
        ),
        { code: "READBACK_REQUIRED" },
      );
    if (this.submitting)
      throw Error("Another action is still awaiting server confirmation.");
    const generation = this.generation;
    this.submitting = true;
    try {
      const nav = await this.api("navigation"),
        workspace = nativeWorkspaces[moduleKey];
      if (generation !== this.generation)
        throw Error("This workspace changed. Refresh before continuing.");
      if (
        nav.user?.id !== this.userId ||
        nav.user?.role !== this.role ||
        !workspace?.roles.includes(this.role) ||
        !nav.allowed?.includes(workspace.access) ||
        !workspaceActions(moduleKey, this.role).includes(action)
      )
        throw Object.assign(
          Error("Your account no longer has access to this action."),
          { status: 403 },
        );
      let result: any;
      try {
        result = await this.api(action, input);
      } catch (e: any) {
        if (!Number.isInteger(e.status) || e.status >= 500) {
          this.needsReadback = true;
          throw Object.assign(
            Error(
              (e.message || "Server confirmation was lost.") +
                " Close this sheet and refresh the records to establish the outcome before retrying.",
            ),
            { code: "OUTCOME_UNKNOWN" },
          );
        }
        throw e;
      }
      if (generation !== this.generation) {
        this.needsReadback = true;
        throw Error(
          "The account changed while the server was confirming this request. Refresh the record to establish its outcome.",
        );
      }
      return result;
    } finally {
      this.submitting = false;
    }
  }
}
