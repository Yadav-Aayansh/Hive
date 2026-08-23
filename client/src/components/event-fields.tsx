import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { MapPinIcon, TicketIcon } from "lucide-react";
import { DateTimeField } from "@/components/date-time-field";
import { IconInput } from "@/components/icon-input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_ITEMS,
  type EventFormValues,
} from "@/lib/event-form";

export function CategoryField({
  form,
  disabled,
}: {
  form: UseFormReturn<EventFormValues>;
  disabled?: boolean;
}) {
  const error = form.formState.errors.category;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="category">Category</FieldLabel>
      <Controller
        control={form.control}
        name="category"
        render={({ field }) => (
          <Select
            items={CATEGORY_ITEMS}
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ITEMS.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error ? <FieldError>{error.message}</FieldError> : null}
    </Field>
  );
}

export function SharedEventFields({
  form,
  lockScheduling,
}: {
  form: UseFormReturn<EventFormValues>;
  lockScheduling?: boolean;
}) {
  const errors = form.formState.errors;

  return (
    <>
      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea id="description" rows={4} {...form.register("description")} />
        {errors.description ? (
          <FieldError>{errors.description.message}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={!!errors.venue}>
        <FieldLabel htmlFor="venue">Venue</FieldLabel>
        <IconInput
          id="venue"
          icon={MapPinIcon}
          placeholder="Where it happens"
          {...form.register("venue")}
        />
        {errors.venue ? <FieldError>{errors.venue.message}</FieldError> : null}
      </Field>

      <div className="flex flex-col gap-4">
        <Field data-invalid={!!errors.startsAt}>
          <FieldLabel htmlFor="startsAt">Starts</FieldLabel>
          <Controller
            control={form.control}
            name="startsAt"
            render={({ field }) => (
              <DateTimeField
                id="startsAt"
                value={field.value}
                onChange={field.onChange}
                disabled={lockScheduling}
              />
            )}
          />
          {errors.startsAt ? (
            <FieldError>{errors.startsAt.message}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={!!errors.endsAt}>
          <FieldLabel htmlFor="endsAt">Ends</FieldLabel>
          <Controller
            control={form.control}
            name="endsAt"
            render={({ field }) => (
              <DateTimeField
                id="endsAt"
                value={field.value}
                onChange={field.onChange}
                disabled={lockScheduling}
              />
            )}
          />
          <FieldDescription>Optional — leave empty if open ended</FieldDescription>
          {errors.endsAt ? (
            <FieldError>{errors.endsAt.message}</FieldError>
          ) : null}
        </Field>
      </div>

      <Field data-invalid={!!errors.capacity}>
        <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
        <IconInput
          id="capacity"
          icon={TicketIcon}
          type="number"
          min={1}
          placeholder="Unlimited"
          disabled={lockScheduling}
          {...form.register("capacity")}
        />
        <FieldDescription>Leave empty for unlimited seats</FieldDescription>
        {errors.capacity ? (
          <FieldError>{errors.capacity.message}</FieldError>
        ) : null}
      </Field>
    </>
  );
}
