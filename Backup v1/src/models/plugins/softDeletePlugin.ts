import { Schema } from "mongoose";

type AnyQuery = any;

function shouldIncludeDeleted(query: AnyQuery) {
  const opts = query?.getOptions?.() ?? {};
  return opts.includeDeleted === true;
}

export function softDeletePlugin(schema: Schema) {
  schema.add({
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
  });

  const excludeDeleted = function (this: AnyQuery) {
    if (shouldIncludeDeleted(this)) return;
    const filter = this.getFilter?.() ?? {};
    if (Object.prototype.hasOwnProperty.call(filter, "deletedAt")) return;
    this.where({ deletedAt: null });
  };

  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);
  schema.pre("findOneAndUpdate", excludeDeleted);

  schema.pre("aggregate", function (this: any) {
    const opts = this.options ?? {};
    if (opts.includeDeleted === true) return;

    const pipeline = this.pipeline();
    const hasDeletedMatch = pipeline.some((stage: any) => stage.$match && stage.$match.deletedAt !== undefined);
    if (!hasDeletedMatch) {
      this.pipeline().unshift({ $match: { deletedAt: null } });
    }
  });
}
