from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        ForeignKey, Index, Text, JSON)
from sqlalchemy.orm import relationship, DeclarativeBase
from datetime import datetime


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default="default_user")
    name = Column(String(255))
    preferred_lang = Column(String(10), default="en-US")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shopping_lists = relationship(
        "ShoppingList", back_populates="user", cascade="all, delete-orphan"
    )
    purchase_history = relationship(
        "PurchaseHistory", back_populates="user", cascade="all, delete-orphan"
    )


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), default="My Shopping List")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="shopping_lists")
    items = relationship(
        "ListItem", back_populates="shopping_list", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_sl_user", "user_id"),
        Index("idx_sl_active", "user_id", "is_active"),
    )


class ListItem(Base):
    __tablename__ = "list_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    list_id = Column(Integer, ForeignKey("shopping_lists.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    item_name_lower = Column(String(255), nullable=False)
    quantity = Column(Float, default=1.0)
    unit = Column(String(50), default="pieces")
    category = Column(String(50), default="other")
    is_checked = Column(Boolean, default=False)
    added_via = Column(String(20), default="voice")
    raw_transcript = Column(Text)
    nlp_method = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shopping_list = relationship("ShoppingList", back_populates="items")

    __table_args__ = (
        Index("idx_li_list", "list_id"),
        Index("idx_li_name", "item_name_lower"),
        Index("idx_li_cat", "list_id", "category"),
    )


class PurchaseHistory(Base):
    __tablename__ = "purchase_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    item_name_lower = Column(String(255), nullable=False)
    category = Column(String(50))
    quantity = Column(Float)
    unit = Column(String(50))
    source_list_id = Column(Integer, ForeignKey("shopping_lists.id"))
    purchased_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="purchase_history")

    __table_args__ = (
        Index("idx_ph_user", "user_id"),
        Index("idx_ph_item", "user_id", "item_name_lower"),
        Index("idx_ph_date", "user_id", "purchased_at"),
    )


class ItemCatalog(Base):
    __tablename__ = "item_catalog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    name_lower = Column(String(255), nullable=False, unique=True)
    category = Column(String(50), nullable=False)
    common_units = Column(JSON)
    avg_price = Column(Float)
    is_seasonal = Column(Boolean, default=False)
    peak_months = Column(JSON)
    order_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_ic_name", "name_lower"),
        Index("idx_ic_cat", "category"),
    )
